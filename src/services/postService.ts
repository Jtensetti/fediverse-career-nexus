import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { extractMentions } from "@/lib/linkify";
import { processFederatedMentions } from "./federationMentionService";

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
  imageAltText?: string;
  contentWarning?: string;
  scheduledFor?: Date;
  pollData?: Record<string, unknown>;
}

// Helper to fetch a post along with its owner's user_id
const getPostOwner = async (postId: string) => {
  console.log('🔍 Getting post owner for post:', postId);
  
  const { data, error } = await supabase
    .from('ap_objects')
    .select('id, attributed_to')
    .eq('id', postId)
    .single();

  console.log('📄 Post owner query result:', { data, error });

  if (error || !data) {
    console.error('❌ Error fetching post owner:', error);
    throw new Error('Post not found');
  }

  const actorId = (data as any).attributed_to as string | null;
  if (!actorId) {
    console.log('👤 Post has no attributed_to actor');
    return null;
  }

  // Resolve owner via safe public view (actors table is RLS-restricted)
  const { data: actorData, error: actorError } = await supabase
    .from('public_actors')
    .select('user_id')
    .eq('id', actorId)
    .maybeSingle();

  if (actorError) {
    console.error('❌ Error resolving post owner actor:', actorError);
  }

  const ownerId = (actorData as any)?.user_id || null;
  console.log('👤 Post owner ID:', ownerId);
  return ownerId as string | null;
};

export const createPost = async (postData: CreatePostData): Promise<boolean> => {
  try {
    console.log('🚀 Starting post creation...', { contentLength: postData.content.length });
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      console.error('❌ Authentication error:', authError);
      toast.error("Du måste vara inloggad för att skapa ett inlägg");
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
        .from('public_profiles')
        .select('username, fullname')
        .eq('id', user.id)
        .single();

      if (profileError || !profile) {
        console.error('❌ Profile error:', profileError);
        toast.error("Profil hittades inte. Vänligen fyll i din profilinformation.");
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
          toast.error("Kunde inte uppdatera användarnamn");
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
        toast.error("Kunde inte skapa användaraktör");
        return false;
      }

      actor = newActor;
    }

    console.log('✅ Actor ready:', actor.id);

    // Fetch profile to include display name in the post content
    const { data: profile } = await supabase
      .from('public_profiles')
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
        toast.error("Kunde inte ladda upp bild");
        return false;
      }

      const { data: { publicUrl } } = supabase.storage
        .from('posts')
        .getPublicUrl(filePath);

      imageUrl = publicUrl;
      console.log('✅ Image uploaded:', imageUrl);
    }

    // Create a "Create" activity that wraps the Note or Question object
    console.log('💾 Creating post in database...');

    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const actorUrl = `${supabaseUrl}/functions/v1/actor/${actor.preferred_username}`;
    const postId = crypto.randomUUID();

    // Determine if this is a poll (Question type) or regular post (Note type)
    const isPoll = postData.pollData && postData.pollData.type === 'Question';

    let noteObject: Record<string, unknown>;

    if (isPoll && postData.pollData) {
      // Create a Question object for polls
      noteObject = {
        ...postData.pollData,
        id: `${actorUrl}/posts/${postId}`,
        attributedTo: actorUrl,
        published: new Date().toISOString(),
        to: ['https://www.w3.org/ns/activitystreams#Public'],
        cc: [`${actorUrl}/followers`],
        actor: {
          id: actor.id,
          preferredUsername: actor.preferred_username,
          name: actorName
        }
      };
    } else {
      // Create a Note object for regular posts
      noteObject = {
        type: 'Note',
        id: `${actorUrl}/posts/${postId}`,
        attributedTo: actorUrl,
        content: postData.content,
        published: new Date().toISOString(),
        to: ['https://www.w3.org/ns/activitystreams#Public'],
        cc: [`${actorUrl}/followers`],
        attachment: imageUrl ? [{
          type: 'Image',
          mediaType: 'image/jpeg', // Standard media type for compatibility
          url: imageUrl,
          name: postData.imageAltText || '' // Alt text for accessibility
        }] : undefined,
        actor: {
          id: actor.id,
          preferredUsername: actor.preferred_username,
          name: actorName
        }
      };
    }

    // Add content warning (summary in ActivityPub) if provided
    if (postData.contentWarning) {
      noteObject.summary = postData.contentWarning;
      noteObject.sensitive = true;
    }

    // Process federated mentions - adds Mention tags and cc addresses for remote users
    try {
      noteObject = await processFederatedMentions(postData.content, noteObject);
      console.log('✅ Federated mentions processed:', {
        tags: (noteObject.tag as unknown[])?.length || 0,
        ccAddresses: (noteObject.cc as string[])?.length || 0
      });
    } catch (mentionError) {
      // Log but don't block the post - NO DATABASE WRITE
      console.warn('⚠️ Mention resolution failed', {
        contentPreview: postData.content.substring(0, 50),
        error: mentionError instanceof Error ? mentionError.message : 'Unknown error'
      });
      // Continue without federated mentions - post still works locally
    }

    const createActivity = {
      '@context': 'https://www.w3.org/ns/activitystreams',
      type: 'Create',
      id: `${actorUrl}/activities/${crypto.randomUUID()}`,
      actor: actorUrl,
      published: new Date().toISOString(),
      to: ['https://www.w3.org/ns/activitystreams#Public'],
      cc: noteObject.cc || [`${actorUrl}/followers`],
      object: noteObject
    };

    const postObject = {
      type: 'Create' as const,
      content: createActivity as unknown as import("@/integrations/supabase/types").Json,
      attributed_to: actor.id,
      published_at: new Date().toISOString(),
      content_warning: postData.contentWarning || null,
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

    // Handle @mentions - create notifications for mentioned users
    const mentions = extractMentions(postData.content);
    if (mentions.length > 0) {
      console.log('📣 Processing mentions:', mentions);
      for (const username of mentions) {
        try {
          // Look up user by username
          const { data: mentionedUser } = await supabase
            .from('public_profiles')
            .select('id')
            .eq('username', username)
            .single();
          
          if (mentionedUser && mentionedUser.id !== user.id) {
            // Create mention notification
            await supabase.from('notifications').insert({
              type: 'mention',
              recipient_id: mentionedUser.id,
              actor_id: user.id,
              object_id: post.id,
              object_type: 'post',
              content: JSON.stringify({ preview: postData.content.substring(0, 100) })
            });
            console.log('✅ Mention notification created for:', username);
          }
        } catch (mentionError) {
          console.warn('⚠️ Could not create mention notification for:', username, mentionError);
        }
      }
    }

    // Queue the activity for federation delivery
    console.log('📤 Queueing post for federation...');
    
    const { data: session } = await supabase.auth.getSession();
    if (session?.session?.access_token) {
      try {
        const { error: federateError } = await supabase.functions.invoke('outbox', {
          body: { activity: createActivity },
          headers: { Authorization: `Bearer ${session.session.access_token}` }
        });
        
        if (federateError) {
          console.warn('⚠️ Federation queue error (post still created locally):', federateError);
        } else {
          console.log('✅ Post queued for federation');
        }
      } catch (fedError) {
        console.warn('⚠️ Could not queue post for federation:', fedError);
      }
    }

    toast.success("Inlägget skapades!");
    return true;

  } catch (error) {
    console.error('❌ Unexpected error creating post:', error);
    toast.error("Ett oväntat fel uppstod");
    return false;
  }
};

export interface UserPostWithMeta extends Post {
  type?: string;
  quotedPost?: {
    id?: string;
    content?: string;
    actor?: {
      id?: string;
      preferredUsername?: string;
      name?: string;
      icon?: { url?: string };
    };
    attachment?: Array<{ url?: string; mediaType?: string }>;
    published?: string;
  };
  isQuoteRepost?: boolean;
}

export const getUserPosts = async (userId?: string): Promise<UserPostWithMeta[]> => {
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
    // Include Create, Note, AND Announce (reposts/boosts)
    // Exclude replies (posts with inReplyTo)
    console.log('📊 Fetching posts for user:', targetUserId);

    // Resolve the user's actor id(s) via safe public view (FK joins to actors are blocked by RLS)
    const { data: userActors, error: userActorsError } = await supabase
      .from('public_actors')
      .select('id, preferred_username')
      .eq('user_id', targetUserId);

    if (userActorsError) {
      console.error('Error fetching user actors:', userActorsError);
      return [];
    }

    const actorIds = (userActors || []).map(a => a.id).filter(Boolean) as string[];
    const actorsMap: Record<string, string> = Object.fromEntries(
      (userActors || []).map(a => [a.id, a.preferred_username])
    );

    if (actorIds.length === 0) {
      console.log('📭 No actor found for user:', targetUserId);
      return [];
    }
    
    const { data: posts, error } = await supabase
      .from('ap_objects')
      .select('id, content, created_at, published_at, type, attributed_to')
      .in('attributed_to', actorIds)
      .in('type', ['Create', 'Note', 'Announce']) // Include Announce for reposts
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

    const authorIds = [targetUserId];
    console.log('👥 Author IDs from posts:', authorIds);

    let profilesMap: Record<string, { fullname: string | null; avatar_url: string | null }> = {};
    if (authorIds.length > 0) {
      const { data: profiles, error: profileError } = await supabase
        .from('public_profiles')
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

    // Filter out replies (posts with inReplyTo) and transform
    const transformedPosts = posts?.filter((post) => {
      const raw = post.content as any;
      // Check for inReplyTo in various possible locations
      const inReplyTo = raw?.inReplyTo || raw?.object?.inReplyTo || raw?.content?.inReplyTo;
      return !inReplyTo; // Exclude replies
    }).map((post) => {
      const raw = post.content as any;
      const isAnnounce = post.type === 'Announce';
      const attributedTo = (post as any).attributed_to as string | undefined;
      const preferredUsername = (attributedTo && actorsMap[attributedTo]) || undefined;
      const profile = profilesMap[targetUserId] || { fullname: null, avatar_url: null };

      // For Announce (repost), extract quoted post and user's comment
      if (isAnnounce) {
        const quotedPost = raw?.object; // The original post being quoted
        const userComment = raw?.content || ''; // User's comment on the repost

        return {
          id: post.id,
          content: userComment,
          created_at: post.created_at,
          user_id: targetUserId,
          type: 'Announce',
          isQuoteRepost: true,
          quotedPost: quotedPost ? {
            id: quotedPost.id,
            content: quotedPost.content,
            actor: quotedPost.actor || quotedPost.attributedTo,
            attachment: quotedPost.attachment,
            published: quotedPost.published,
          } : undefined,
          author: {
            username: preferredUsername || 'user',
            fullname: profile.fullname || preferredUsername || 'Nolto User',
            avatar_url: profile.avatar_url || undefined,
          },
        } as UserPostWithMeta;
      }

      // Regular post (Create/Note)
      const note = raw?.type === 'Create' ? raw.object : raw;
      
      // Skip posts with no actual content
      const contentText = note?.content || '';
      if (!contentText) return null;

      const transformedPost: UserPostWithMeta = {
        id: post.id,
        content: contentText,
        created_at: post.created_at,
        user_id: targetUserId,
        type: post.type,
        image_url: note?.image,
        author: {
          username: preferredUsername || 'user',
          fullname: profile.fullname || preferredUsername || 'Nolto User',
          avatar_url: profile.avatar_url || undefined,
        },
      };

      console.log('🔄 Transformed post:', {
        id: transformedPost.id,
        content: transformedPost.content.substring(0, 50) + '...',
        author: transformedPost.author
      });

      return transformedPost;
    }).filter(Boolean) || [];

    console.log('✅ Final transformed posts:', transformedPosts.length);
    return transformedPosts as UserPostWithMeta[];
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

    console.log('📄 Post owner:', ownerId, 'Current user:', user.id);

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
    let updatedContent;

    // Handle different content structures
    if (currentContent?.type === 'Create' && currentContent.object) {
      // ActivityPub Create activity structure
      updatedContent = {
        ...currentContent,
        object: {
          ...currentContent.object,
          content: updates.content
        }
      };
    } else if (currentContent?.type === 'Question') {
      // Poll (Question) type - only update the question text, preserve options
      updatedContent = {
        ...currentContent,
        content: updates.content
      };
    } else {
      // Direct content structure (Note type)
      updatedContent = {
        ...currentContent,
        content: updates.content
      };
    }

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
    toast.success('Inlägget uppdaterades!');
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

    console.log('📄 Post owner for deletion:', ownerId, 'Current user:', user.id);

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
    toast.success('Inlägget raderades!');
  } catch (error) {
    console.error('❌ Error deleting post:', error);
    throw error;
  }
};
