
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface Post {
  id: string;
  content: string;
  created_at: string;
  user_id: string;
  image_url?: string;
  author?: {
    username: string;
    avatar_url?: string;
    fullname?: string;
  };
}

export interface CreatePostData {
  content: string;
  imageFile?: File;
  scheduledFor?: Date;
}

export const createPost = async (postData: CreatePostData): Promise<boolean> => {
  try {
    console.log('🚀 Starting post creation...', { contentLength: postData.content.length });
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      console.error('❌ Authentication error:', authError);
      toast.error("You must be logged in to create a post");
      return false;
    }
    
    console.log('✅ User authenticated:', user.id);

    // Check/create actor
    let { data: actor, error: actorError } = await supabase
      .from('actors')
      .select('id, preferred_username')
      .eq('user_id', user.id)
      .single();

    if (actorError || !actor) {
      console.log('🔍 No actor found, checking profile...');

      // Get user profile
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('username, fullname')
        .eq('id', user.id)
        .single();

      if (profileError || !profile) {
        console.error('❌ Profile error:', profileError);
        toast.error("Profile not found. Please complete your profile setup.");
        return false;
      }

      // Create username if needed
      let username = profile.username;
      if (!username) {
        username = `user_${user.id.slice(0, 8)}`;
        console.log('📝 Creating default username:', username);
        
        const { error: updateError } = await supabase
          .from('profiles')
          .update({ username })
          .eq('id', user.id);

        if (updateError) {
          console.error('❌ Username update error:', updateError);
          toast.error("Failed to update username");
          return false;
        }
      }

      // Create actor
      console.log('🎭 Creating actor...');
      const { data: newActor, error: createActorError } = await supabase
        .from('actors')
        .insert({
          user_id: user.id,
          preferred_username: username,
          type: 'Person',
          status: 'active'
        })
        .select('id, preferred_username')
        .single();

      if (createActorError || !newActor) {
        console.error('❌ Actor creation error:', createActorError);
        toast.error("Failed to create user actor");
        return false;
      }

      actor = newActor;
    }

    console.log('✅ Actor ready:', actor.id);

    // Fetch profile to include display name in the post content
    const { data: profile } = await supabase
      .from('profiles')
      .select('username, fullname')
      .eq('id', user.id)
      .single();
    const actorName = profile?.fullname || profile?.username || actor.preferred_username;

    // Handle image upload if provided
    let imageUrl: string | null = null;
    if (postData.imageFile) {
      console.log('📸 Uploading image...');
      
      const fileExt = postData.imageFile.name.split('.').pop();
      const fileName = `${user.id}-${Date.now()}.${fileExt}`;
      const filePath = `posts/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('posts')
        .upload(filePath, postData.imageFile);

      if (uploadError) {
        console.error('❌ Image upload error:', uploadError);
        toast.error("Failed to upload image");
        return false;
      }

      const { data: { publicUrl } } = supabase.storage
        .from('posts')
        .getPublicUrl(filePath);

      imageUrl = publicUrl;
      console.log('✅ Image uploaded:', imageUrl);
    }

    // Create post in ap_objects table
    console.log('💾 Creating post in database...');
    const postObject = {
      type: 'Note',
      content: {
        type: 'Note',
        content: postData.content,
        image: imageUrl,
        actor: {
          id: actor.id,
          preferredUsername: actor.preferred_username,
          name: actorName
        }
      },
      attributed_to: actor.id
    };

    const { data: post, error: postError } = await supabase
      .from('ap_objects')
      .insert(postObject)
      .select()
      .single();

    if (postError) {
      console.error('❌ Post creation error:', postError);
      toast.error(`Failed to create post: ${postError.message}`);
      return false;
    }

    console.log('✅ Post created successfully:', post.id);
    toast.success("Post created successfully!");
    return true;

  } catch (error) {
    console.error('❌ Unexpected error creating post:', error);
    toast.error("An unexpected error occurred");
    return false;
  }
};

export const getUserPosts = async (userId?: string): Promise<Post[]> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    const targetUserId = userId || user?.id;
    
    if (!targetUserId) {
      return [];
    }

    // Get posts from ap_objects where the attributed actor belongs to the user
    const { data: posts, error } = await supabase
      .from('ap_objects')
      .select(`
        id,
        content,
        created_at,
        actors!ap_objects_attributed_to_fkey (
          user_id,
          preferred_username
        )
      `)
      .eq('actors.user_id', targetUserId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching user posts:', error);
      return [];
    }

    return posts?.map(post => {
      const content = post.content as any;
      return {
        id: post.id,
        content: content?.content || '',
        created_at: post.created_at,
        user_id: targetUserId,
        image_url: content?.image,
        author: {
          username: (post.actors as any)?.preferred_username || 'Unknown',
          avatar_url: undefined,
          fullname: undefined
        }
      };
    }) || [];
  } catch (error) {
    console.error('Error fetching user posts:', error);
    return [];
  }
};

export const updatePost = async (postId: string, updates: { content: string }): Promise<void> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('You must be logged in to update posts');
    }

    // Get the post to check ownership
    const { data: post, error: fetchError } = await supabase
      .from('ap_objects')
      .select(`
        id,
        content,
        actors!ap_objects_attributed_to_fkey (
          user_id
        )
      `)
      .eq('id', postId)
      .single();

    if (fetchError || !post) {
      throw new Error('Post not found');
    }

    // Check ownership
    if ((post.actors as any)?.user_id !== user.id) {
      throw new Error('You can only edit your own posts');
    }

    // Update the content
    const currentContent = post.content as any;
    const updatedContent = {
      ...currentContent,
      content: updates.content
    };

    const { error: updateError } = await supabase
      .from('ap_objects')
      .update({ content: updatedContent })
      .eq('id', postId);

    if (updateError) {
      throw new Error(`Failed to update post: ${updateError.message}`);
    }

    toast.success('Post updated successfully!');
  } catch (error) {
    console.error('Error updating post:', error);
    throw error;
  }
};

export const deletePost = async (postId: string): Promise<void> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('You must be logged in to delete posts');
    }

    // Get the post to check ownership
    const { data: post, error: fetchError } = await supabase
      .from('ap_objects')
      .select(`
        id,
        actors!ap_objects_attributed_to_fkey (
          user_id
        )
      `)
      .eq('id', postId)
      .single();

    if (fetchError || !post) {
      throw new Error('Post not found');
    }

    // Check ownership
    if ((post.actors as any)?.user_id !== user.id) {
      throw new Error('You can only delete your own posts');
    }

    const { error: deleteError } = await supabase
      .from('ap_objects')
      .delete()
      .eq('id', postId);

    if (deleteError) {
      throw new Error(`Failed to delete post: ${deleteError.message}`);
    }

    toast.success('Post deleted successfully!');
  } catch (error) {
    console.error('Error deleting post:', error);
    throw error;
  }
};
