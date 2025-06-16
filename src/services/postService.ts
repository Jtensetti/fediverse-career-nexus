
import { supabase } from "@/integrations/supabase/client";

export interface Post {
  id: string;
  content: string;
  imageUrl?: string;
  published_at: string;
  user_id: string;
  scheduled_for?: string;
}

export interface CreatePostData {
  content: string;
  imageFile?: File;
  scheduledFor?: Date;
}

interface ActivityContent {
  '@context': string;
  type: string;
  actor: string;
  object: {
    type: string;
    content: string;
    attachment?: Array<{
      type: string;
      url: string;
      mediaType: string;
    }>;
    to: string[];
    cc: string[];
    published: string;
  };
  to: string[];
  cc: string[];
  published: string;
}

// Helper function to ensure user has an actor
const ensureUserHasActor = async (userId: string): Promise<string> => {
  // First check if actor already exists
  const { data: existingActor } = await supabase
    .from('actors')
    .select('id')
    .eq('user_id', userId)
    .single();

  if (existingActor) {
    return existingActor.id;
  }

  // Get user profile to create actor
  const { data: profile } = await supabase
    .from('profiles')
    .select('username')
    .eq('id', userId)
    .single();

  if (!profile?.username) {
    throw new Error('User profile not found');
  }

  // Create actor for user
  const { data: newActor, error: createActorError } = await supabase
    .from('actors')
    .insert({
      user_id: userId,
      preferred_username: profile.username,
      type: 'Person',
      status: 'active'
    })
    .select('id')
    .single();

  if (createActorError || !newActor) {
    throw new Error(`Failed to create actor: ${createActorError?.message}`);
  }

  return newActor.id;
};

export const createPost = async (postData: CreatePostData): Promise<Post | null> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      throw new Error('User not authenticated');
    }

    // Ensure user has an actor (create if doesn't exist)
    const actorId = await ensureUserHasActor(user.id);

    // Fetch username for proper actor URL
    const { data: profile } = await supabase
      .from('profiles')
      .select('username')
      .eq('id', user.id)
      .single();

    if (!profile?.username) {
      throw new Error('User profile not found');
    }

    const supabaseUrl =
      import.meta.env.VITE_SUPABASE_URL ||
      'https://tvvrdoklywxllcpzxdls.supabase.co';
    const actorUrl = `${supabaseUrl}/functions/v1/actor/${profile.username}`;

    let imageUrl: string | undefined;

    // Handle image upload if provided
    if (postData.imageFile) {
      const fileExt = postData.imageFile.name.split('.').pop();
      const fileName = `${Date.now()}.${fileExt}`;
      const filePath = `post-images/${user.id}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('posts')
        .upload(filePath, postData.imageFile);

      if (uploadError) {
        throw new Error(`Failed to upload image: ${uploadError.message}`);
      }

      const { data: { publicUrl } } = supabase.storage
        .from('posts')
        .getPublicUrl(filePath);

      imageUrl = publicUrl;
    }

    // Create the post in the database using the actor ID
    const { data: post, error: postError } = await supabase
      .from('ap_objects')
      .insert({
        type: 'Create',
        content: {
          '@context': 'https://www.w3.org/ns/activitystreams',
          type: 'Create',
          actor: actorUrl,
          object: {
            type: 'Note',
            content: postData.content,
            ...(imageUrl && { 
              attachment: [{
                type: 'Image',
                url: imageUrl,
                mediaType: postData.imageFile?.type || 'image/jpeg'
              }]
            }),
            to: ['https://www.w3.org/ns/activitystreams#Public'],
            cc: [`${actorUrl}/followers`],
            published: postData.scheduledFor ? postData.scheduledFor.toISOString() : new Date().toISOString()
          },
          to: ['https://www.w3.org/ns/activitystreams#Public'],
          cc: [`${actorUrl}/followers`],
          published: postData.scheduledFor ? postData.scheduledFor.toISOString() : new Date().toISOString()
        },
        attributed_to: actorId  // Use the actor ID
      })
      .select()
      .single();

    if (postError) {
      throw new Error(`Failed to create post: ${postError.message}`);
    }

    console.log('Post created successfully:', post);

    // If not scheduled, federate the post immediately
    if (!postData.scheduledFor) {
      await federatePost(post.content, actorId);
    }

    return {
      id: post.id,
      content: postData.content,
      imageUrl,
      published_at: post.published_at,
      user_id: user.id,
      scheduled_for: postData.scheduledFor?.toISOString()
    };

  } catch (error) {
    console.error('Error creating post:', error);
    throw error;
  }
};

const federatePost = async (activity: any, actorId: string) => {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      throw new Error('No active session');
    }

    // Get the user's profile to find their username
    const { data: profile } = await supabase
      .from('profiles')
      .select('username')
      .eq('id', session.user.id)
      .single();

    if (!profile?.username) {
      throw new Error('User profile not found');
    }

    // Send the activity to the outbox for federation
    const response = await fetch(`https://tvvrdoklywxllcpzxdls.supabase.co/functions/v1/outbox/${profile.username}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/activity+json',
        'Authorization': `Bearer ${session.access_token}`,
      },
      body: JSON.stringify(activity),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Federation failed: ${response.status} - ${errorText}`);
    }

    const result = await response.json();
    console.log('Post federated successfully:', result);
    
  } catch (error) {
    console.error('Error federating post:', error);
    // Don't throw here - post creation should succeed even if federation fails
  }
};

export const getScheduledPosts = async (): Promise<Post[]> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      throw new Error('User not authenticated');
    }

    // Ensure user has an actor
    const actorId = await ensureUserHasActor(user.id);

    const { data: posts, error } = await supabase
      .from('ap_objects')
      .select('*')
      .eq('attributed_to', actorId)
      .eq('type', 'Create')
      .gt('content->published', new Date().toISOString())
      .order('content->published', { ascending: true });

    if (error) {
      throw new Error(`Failed to fetch scheduled posts: ${error.message}`);
    }

    return posts?.map(post => {
      const content = post.content as unknown as ActivityContent;
      return {
        id: post.id,
        content: content.object.content,
        imageUrl: content.object.attachment?.[0]?.url,
        published_at: post.published_at,
        user_id: user.id,
        scheduled_for: content.published
      };
    }) || [];

  } catch (error) {
    console.error('Error fetching scheduled posts:', error);
    throw error;
  }
};

export interface UpdatePostData {
  content?: string;
  imageFile?: File | null;
}

export const updatePost = async (id: string, data: UpdatePostData): Promise<Post | null> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      throw new Error('User not authenticated');
    }

    const { data: existing } = await supabase
      .from('ap_objects')
      .select('content')
      .eq('id', id)
      .single();

    if (!existing) {
      throw new Error('Post not found');
    }

    const content = existing.content as ActivityContent;

    if (data.content !== undefined) {
      content.object.content = data.content;
    }

    let imageUrl = content.object.attachment?.[0]?.url;

    if (data.imageFile) {
      const fileExt = data.imageFile.name.split('.').pop();
      const fileName = `${Date.now()}.${fileExt}`;
      const filePath = `post-images/${user.id}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('posts')
        .upload(filePath, data.imageFile);

      if (uploadError) {
        throw new Error(`Failed to upload image: ${uploadError.message}`);
      }

      const { data: { publicUrl } } = supabase.storage
        .from('posts')
        .getPublicUrl(filePath);

      imageUrl = publicUrl;

      content.object.attachment = [{
        type: 'Image',
        url: imageUrl,
        mediaType: data.imageFile.type || 'image/jpeg'
      }];
    }

    const { data: updated, error } = await supabase
      .from('ap_objects')
      .update({ content })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update post: ${error.message}`);
    }

    return {
      id: updated.id,
      content: content.object.content,
      imageUrl,
      published_at: updated.published_at,
      user_id: user.id
    };

  } catch (error) {
    console.error('Error updating post:', error);
    throw error;
  }
};

export const deletePost = async (id: string): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('ap_objects')
      .delete()
      .eq('id', id);

    if (error) {
      throw new Error(`Failed to delete post: ${error.message}`);
    }

    return true;
  } catch (error) {
    console.error('Error deleting post:', error);
    throw error;
  }
};
