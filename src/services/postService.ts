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
  console.log('🔍 Checking actor for user:', userId);
  
  // First check if actor already exists
  const { data: existingActor, error: actorError } = await supabase
    .from('actors')
    .select('id')
    .eq('user_id', userId)
    .single();

  if (actorError) {
    console.log('❌ Error checking existing actor:', actorError);
  }

  if (existingActor) {
    console.log('✅ Found existing actor:', existingActor.id);
    return existingActor.id;
  }

  console.log('🔧 No actor found, creating new one...');

  // Get user profile to create actor
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('username')
    .eq('id', userId)
    .single();

  if (profileError) {
    console.log('❌ Error fetching profile:', profileError);
    throw new Error(`Failed to fetch profile: ${profileError.message}`);
  }

  if (!profile?.username) {
    console.log('⚠️ No username found, creating default username');
    // If no username exists, create a default one
    const defaultUsername = `user_${userId.slice(0, 8)}`;
    
    // Update the profile with a default username
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ username: defaultUsername })
      .eq('id', userId);
    
    if (updateError) {
      console.log('❌ Error updating username:', updateError);
      throw new Error(`Failed to create username: ${updateError.message}`);
    }
    
    console.log('✅ Created default username:', defaultUsername);
    
    // Use the new username for actor creation
    const { data: newActor, error: createActorError } = await supabase
      .from('actors')
      .insert({
        user_id: userId,
        preferred_username: defaultUsername,
        type: 'Person',
        status: 'active'
      })
      .select('id')
      .single();

    if (createActorError || !newActor) {
      console.log('❌ Error creating actor:', createActorError);
      throw new Error(`Failed to create actor: ${createActorError?.message}`);
    }

    console.log('✅ Created new actor:', newActor.id);
    return newActor.id;
  }

  // Create actor for user with existing username
  console.log('🔧 Creating actor with existing username:', profile.username);
  
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
    console.log('❌ Error creating actor:', createActorError);
    throw new Error(`Failed to create actor: ${createActorError?.message}`);
  }

  console.log('✅ Created new actor:', newActor.id);
  return newActor.id;
};

export const createPost = async (postData: CreatePostData): Promise<Post | null> => {
  try {
    console.log('🚀 Starting post creation...', { contentLength: postData.content.length });
    
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError) {
      console.log('❌ Auth error:', userError);
      throw new Error(`Authentication error: ${userError.message}`);
    }
    
    if (!user) {
      console.log('❌ No authenticated user found');
      throw new Error('User not authenticated');
    }

    console.log('✅ User authenticated:', user.id);

    // Ensure user has an actor (create if doesn't exist)
    const actorId = await ensureUserHasActor(user.id);

    // Fetch username for proper actor URL
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('username')
      .eq('id', user.id)
      .single();

    if (profileError) {
      console.log('❌ Error fetching profile for actor URL:', profileError);
      throw new Error(`Failed to fetch profile: ${profileError.message}`);
    }

    if (!profile?.username) {
      console.log('❌ No username found in profile');
      throw new Error('User profile not found');
    }

    console.log('✅ Profile found:', profile.username);

    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    if (!supabaseUrl) {
      console.log('❌ VITE_SUPABASE_URL not set');
      throw new Error('VITE_SUPABASE_URL not set');
    }
    const actorUrl = `${supabaseUrl}/functions/v1/actor/${profile.username}`;

    let imageUrl: string | undefined;

    // Handle image upload if provided
    if (postData.imageFile) {
      console.log('📷 Uploading image:', postData.imageFile.name);
      
      const fileExt = postData.imageFile.name.split('.').pop();
      const fileName = `${Date.now()}.${fileExt}`;
      const filePath = `post-images/${user.id}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('posts')
        .upload(filePath, postData.imageFile);

      if (uploadError) {
        console.log('❌ Image upload error:', uploadError);
        throw new Error(`Failed to upload image: ${uploadError.message}`);
      }

      const { data: { publicUrl } } = supabase.storage
        .from('posts')
        .getPublicUrl(filePath);

      imageUrl = publicUrl;
      console.log('✅ Image uploaded successfully:', imageUrl);
    }

    const publishedTime = postData.scheduledFor ? postData.scheduledFor.toISOString() : new Date().toISOString();

    console.log('💾 Creating post in database...');

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
            published: publishedTime
          },
          to: ['https://www.w3.org/ns/activitystreams#Public'],
          cc: [`${actorUrl}/followers`],
          published: publishedTime
        },
        attributed_to: actorId  // Use the actor ID
      })
      .select()
      .single();

    if (postError) {
      console.log('❌ Post creation error:', postError);
      throw new Error(`Failed to create post: ${postError.message}`);
    }

    console.log('✅ Post created successfully:', post.id);

    // If not scheduled, federate the post immediately
    if (!postData.scheduledFor) {
      console.log('🌐 Federating post...');
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
    console.error('❌ Error creating post:', error);
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
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    if (!supabaseUrl) {
      throw new Error('VITE_SUPABASE_URL not set');
    }
    const response = await fetch(`${supabaseUrl}/functions/v1/outbox/${profile.username}`, {
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

    // Create a mutable copy of the content and ensure object exists
    const content = JSON.parse(JSON.stringify(existing.content)) as ActivityContent;
    if (!content.object) {
      content.object = { type: 'Note', content: '' } as ActivityContent['object'];
    }

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
      .update({ content: content as any })
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
