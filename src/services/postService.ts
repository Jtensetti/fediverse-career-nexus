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

// Helper to fetch a post along with its owner's user_id
const getPostOwner = async (postId: string) => {
  const { data, error } = await supabase
    .from('federated_feed')
    .select(
      `id, actors!ap_objects_attributed_to_fkey (user_id)`
    )
    .eq('id', postId)
    .single();

  if (error || !data) {
    console.error('❌ Error fetching post owner:', error);
    throw new Error('Post not found');
  }

  return (data as any).actors?.user_id as string | null;
};

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

    // Create a "Create" activity that wraps the Note object
    console.log('💾 Creating post in database...');

    const noteObject = {
      type: 'Note',
      content: postData.content,
      image: imageUrl,
      actor: {
        id: actor.id,
        preferredUsername: actor.preferred_username,
        name: actorName
      }
    };

    const createActivity = {
      type: 'Create',
      actor: actor.id,
      object: noteObject
    };

    const postObject = {
      type: 'Create',
      content: createActivity,
      attributed_to: actor.id,
      published_at: new Date().toISOString()
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
    console.log('🔍 getUserPosts - Starting with userId:', userId);
    
    const { data: { user } } = await supabase.auth.getUser();
    const targetUserId = userId || user?.id;
    
    console.log('🔍 getUserPosts - Target user ID:', targetUserId);
    console.log('🔍 getUserPosts - Current user ID:', user?.id);
    
    if (!targetUserId) {
      console.log('❌ No target user ID provided');
      return [];
    }

    // Get posts from ap_objects where the attributed actor belongs to the user
    console.log('📊 Fetching posts for user:', targetUserId);
    
    const { data: posts, error } = await supabase
      .from('ap_objects')
      .select(
        `id, content, created_at, published_at, actors!ap_objects_attributed_to_fkey (
          user_id,
          preferred_username,
          profiles (
            fullname,
            username,
            avatar_url
          )
        )`
      )
      .eq('actors.user_id', targetUserId)
      .order('published_at', { ascending: false });

    console.log('📄 Raw posts query result:', { 
      count: posts?.length, 
      error: error,
      posts: posts?.slice(0, 3) // Log first 3 for debugging
    });

    if (error) {
      console.error('Error fetching user posts:', error);
      return [];
    }

    if (!posts || posts.length === 0) {
      console.log('📭 No posts found for user:', targetUserId);
      return [];
    }

    const authorIds = posts?.map(p => (p.actors as any)?.user_id).filter(Boolean) || [];
    console.log('👥 Author IDs from posts:', authorIds);

    let profilesMap: Record<string, { fullname: string | null; avatar_url: string | null }> = {};
    if (authorIds.length > 0) {
      const { data: profiles, error: profileError } = await supabase
        .from('profiles')
        .select('id, fullname, avatar_url')
        .in('id', authorIds);

      console.log('📝 Profiles for posts:', {
        count: profiles?.length,
        error: profileError,
        profiles: profiles
      });

      if (profiles) {
        profilesMap = Object.fromEntries(
          profiles.map(p => [p.id, { fullname: p.fullname, avatar_url: p.avatar_url }])
        );
      }
    }

    const transformedPosts = posts?.map((post) => {
      const raw = post.content as any;
      const note = raw?.type === 'Create' ? raw.object : raw;
      const authorUserId = (post.actors as any)?.user_id as string | undefined;
      const profile = (authorUserId && profilesMap[authorUserId]) || { fullname: null, avatar_url: null };

      const transformedPost = {
        id: post.id,
        content: note?.content || '',
        created_at: post.created_at,
        user_id: targetUserId,
        image_url: note?.image,
        author: {
          username: (post.actors as any)?.preferred_username || 'Unknown',
          fullname: profile.fullname || (post.actors as any)?.preferred_username || 'Unknown User',
          avatar_url: profile.avatar_url || undefined,
        },
      };

      console.log('🔄 Transformed post:', {
        id: transformedPost.id,
        content: transformedPost.content.substring(0, 50) + '...',
        author: transformedPost.author
      });

      return transformedPost;
    }) || [];

    console.log('✅ Final transformed posts:', transformedPosts.length);
    return transformedPosts;
  } catch (error) {
    console.error('Error fetching user posts:', error);
    return [];
  }
};

export const updatePost = async (postId: string, updates: { content: string }): Promise<void> => {
  try {
    console.log('🔄 Updating post:', postId, 'with content:', updates.content);
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      console.error('❌ No user found for post update');
      throw new Error('You must be logged in to update posts');
    }

    console.log('👤 User found for update:', user.id);

    // Get the post owner to check ownership
    const ownerId = await getPostOwner(postId);

    console.log('📄 Post owner:', ownerId);

    if (ownerId !== user.id) {
      console.error('❌ User does not own this post');
      throw new Error('You can only edit your own posts');
    }

    // Fetch current content for update
    const { data: postData, error: fetchError } = await supabase
      .from('ap_objects')
      .select('content')
      .eq('id', postId)
      .single();

    if (fetchError || !postData) {
      console.error('❌ Error fetching post for update:', fetchError);
      throw new Error('Post not found');
    }

    const currentContent = postData.content as any;
    const updatedContent = {
      ...currentContent,
      content: updates.content
    };

    console.log('📝 Updating content:', updatedContent);

    const { error: updateError } = await supabase
      .from('ap_objects')
      .update({ content: updatedContent })
      .eq('id', postId);

    if (updateError) {
      console.error('❌ Error updating post:', updateError);
      throw new Error(`Failed to update post: ${updateError.message}`);
    }

    console.log('✅ Post updated successfully');
    toast.success('Post updated successfully!');
  } catch (error) {
    console.error('❌ Error updating post:', error);
    throw error;
  }
};

export const deletePost = async (postId: string): Promise<void> => {
  try {
    console.log('🗑️ Deleting post:', postId);
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      console.error('❌ No user found for post deletion');
      throw new Error('You must be logged in to delete posts');
    }

    console.log('👤 User found for deletion:', user.id);

    // Get the post owner to check ownership
    const ownerId = await getPostOwner(postId);

    console.log('📄 Post owner for deletion:', ownerId);

    if (ownerId !== user.id) {
      console.error('❌ User does not own this post');
      throw new Error('You can only delete your own posts');
    }

    console.log('🗑️ Proceeding with deletion');

    const { error: deleteError } = await supabase
      .from('ap_objects')
      .delete()
      .eq('id', postId);

    if (deleteError) {
      console.error('❌ Error deleting post:', deleteError);
      throw new Error(`Failed to delete post: ${deleteError.message}`);
    }

    console.log('✅ Post deleted successfully');
    toast.success('Post deleted successfully!');
  } catch (error) {
    console.error('❌ Error deleting post:', error);
    throw error;
  }
};
