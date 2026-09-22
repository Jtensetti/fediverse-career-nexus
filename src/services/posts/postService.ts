import { publicMediaUrl } from "@/lib/media";
import { requestContentDeletion } from "@/services/privacy/deletionService";
import { getLocalActorUrl, getNoltoInstanceDomain } from "@/lib/federation";
import { createUserActor } from "../federation/actorService";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { processFederatedMentions } from "../federation/federationMentionService";

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

  const { data, error } = await supabase
    .from('ap_objects')
    .select('id, attributed_to')
    .eq('id', postId)
    .single();

  if (error || !data) {
    console.error('Error fetching post owner:', error);
    throw new Error('Post not found');
  }

  const actorId = (data as any).attributed_to as string | null;
  if (!actorId) {

    return null;
  }

  // Resolve owner via safe public view (actors table is RLS-restricted)
  const { data: actorData, error: actorError } = await supabase
    .from('public_actors')
    .select('user_id')
    .eq('id', actorId)
    .maybeSingle();

  if (actorError) {
    console.error('Error resolving post owner actor:', actorError);
  }

  const ownerId = (actorData as any)?.user_id || null;

  return ownerId as string | null;
};

export const createPost = async (postData: CreatePostData): Promise<boolean> => {
  try {

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      console.error('Authentication error:', authError);
      toast.error("Du måste vara inloggad för att skapa ett inlägg");
      return false;
    }

    // Local posting does not implicitly enable public federation.
    if (!await createUserActor(user.id, false)) return false;
    const { data: actor, error: actorError } = await supabase.from('public_actors')
      .select('id, preferred_username').eq('user_id', user.id).eq('is_remote', false).single();
    if (actorError || !actor) throw actorError || new Error('Account not ready');

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

      const fileExt = postData.imageFile.name.split('.').pop();
      const fileName = `${user.id}-${Date.now()}.${fileExt}`;
      const filePath = `posts/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('posts')
        .upload(filePath, postData.imageFile);

      if (uploadError) {
        console.error('Image upload error:', uploadError);
        toast.error("Kunde inte ladda upp bild");
        return false;
      }

      const publicUrl = publicMediaUrl('posts', filePath);

      imageUrl = publicUrl;

    }

    // Create a "Create" activity that wraps the Note or Question object

    if (!actor.preferred_username) throw new Error("Actor username is missing");
    const actorUrl = getLocalActorUrl(actor.preferred_username);
    const baseUrl = `https://${getNoltoInstanceDomain()}`;
    const followersUrl = `${baseUrl}/functions/v1/followers/${actor.preferred_username}`;
    const postId = crypto.randomUUID();

    // Determine if this is a poll (Question type) or regular post (Note type)
    const isPoll = postData.pollData && postData.pollData.type === 'Question';

    let noteObject: Record<string, unknown>;

    if (isPoll && postData.pollData) {
      // Create a Question object for polls
      noteObject = {
        ...postData.pollData,
        id: `${baseUrl}/functions/v1/objects/${postId}`,
        attributedTo: actorUrl,
        published: new Date().toISOString(),
        to: ['https://www.w3.org/ns/activitystreams#Public'],
        cc: [followersUrl],
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
        id: `${baseUrl}/functions/v1/objects/${postId}`,
        attributedTo: actorUrl,
        content: postData.content,
        published: new Date().toISOString(),
        to: ['https://www.w3.org/ns/activitystreams#Public'],
        cc: [followersUrl],
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

    } catch (mentionError) {
      // Log but don't block the post - NO DATABASE WRITE
      console.warn('Mention resolution failed', {
        contentPreview: postData.content.substring(0, 50),
        error: mentionError instanceof Error ? mentionError.message : 'Unknown error'
      });
      // Continue without federated mentions - post still works locally
    }

    const createActivity = {
      '@context': 'https://www.w3.org/ns/activitystreams',
      type: 'Create',
      id: `${baseUrl}/functions/v1/activities/${postId}`,
      actor: actorUrl,
      published: new Date().toISOString(),
      to: ['https://www.w3.org/ns/activitystreams#Public'],
      cc: noteObject.cc || [followersUrl],
      object: noteObject
    };

    const postObject = {
      id: postId,
      type: 'Create' as const,
      content: createActivity as unknown as import("@/integrations/supabase/types").Json,
      attributed_to: actor.id,
      published_at: new Date().toISOString(),
      content_warning: postData.contentWarning || null,
    };

    const { error: postError } = await supabase
      .from('ap_objects')
      .insert(postObject)
      .select()
      .single();

    if (postError) {
      console.error('Post creation error:', postError);
      toast.error(`Failed to create post: ${postError.message}`);
      return false;
    }

    // A database trigger queues federation in the same transaction as this insert.

    toast.success("Inlägget skapades!");
    return true;

  } catch (error) {
    console.error('Unexpected error creating post:', error);
    toast.error("Ett oväntat fel uppstod");
    return false;
  }
};

export const updatePost = async (postId: string, updates: { content: string }): Promise<void> => {
  try {

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      console.error('No user found for post update');
      throw new Error('You must be logged in to update posts');
    }

    // Get the post owner to check ownership
    const ownerId = await getPostOwner(postId);

    if (ownerId !== user.id) {
      console.error('User does not own this post');
      throw new Error('You can only edit your own posts');
    }

    // Fetch current content for update
    const { data: postData, error: fetchError } = await supabase
      .from('ap_objects')
      .select('content')
      .eq('id', postId)
      .single();

    if (fetchError || !postData) {
      console.error('Error fetching post for update:', fetchError);
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

    const { error: updateError } = await supabase
      .from('ap_objects')
      .update({ content: updatedContent })
      .eq('id', postId);

    if (updateError) {
      console.error('Error updating post:', updateError);
      throw new Error(`Failed to update post: ${updateError.message}`);
    }

    toast.success('Inlägget uppdaterades!');
  } catch (error) {
    console.error('Error updating post:', error);
    throw error;
  }
};

export const deletePost = async (postId: string): Promise<void> => {
  try {

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      console.error('No user found for post deletion');
      throw new Error('You must be logged in to delete posts');
    }

    // Get the post owner to check ownership
    const ownerId = await getPostOwner(postId);

    if (ownerId !== user.id) {
      console.error('User does not own this post');
      throw new Error('You can only delete your own posts');
    }

    await requestContentDeletion('post', postId);
    toast.success('Inlägget är dolt och raderas permanent efter 30 dagar.');
  } catch (error) {
    console.error('Error deleting post:', error);
    throw error;
  }
};
