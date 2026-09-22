export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      activities: {
        Row: {
          actor_id: string | null
          created_at: string
          id: string
          payload: Json
          type: string
        }
        Insert: {
          actor_id?: string | null
          created_at?: string
          id?: string
          payload: Json
          type: string
        }
        Update: {
          actor_id?: string | null
          created_at?: string
          id?: string
          payload?: Json
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "activities_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "actors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activities_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "follower_batch_stats"
            referencedColumns: ["actor_id"]
          },
          {
            foreignKeyName: "activities_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "public_actors"
            referencedColumns: ["id"]
          },
        ]
      }
      actor_followers: {
        Row: {
          created_at: string
          follow_activity_id: string | null
          follower_actor_url: string
          id: string
          local_actor_id: string
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          follow_activity_id?: string | null
          follower_actor_url: string
          id?: string
          local_actor_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          follow_activity_id?: string | null
          follower_actor_url?: string
          id?: string
          local_actor_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "actor_followers_local_actor_id_fkey"
            columns: ["local_actor_id"]
            isOneToOne: false
            referencedRelation: "actors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "actor_followers_local_actor_id_fkey"
            columns: ["local_actor_id"]
            isOneToOne: false
            referencedRelation: "follower_batch_stats"
            referencedColumns: ["actor_id"]
          },
          {
            foreignKeyName: "actor_followers_local_actor_id_fkey"
            columns: ["local_actor_id"]
            isOneToOne: false
            referencedRelation: "public_actors"
            referencedColumns: ["id"]
          },
        ]
      }
      actors: {
        Row: {
          also_known_as: string[] | null
          created_at: string
          follower_count: number | null
          following_count: number | null
          id: string
          is_remote: boolean | null
          manually_approves_followers: boolean
          moved_to: string | null
          preferred_username: string
          private_key: string | null
          public_key: string | null
          remote_actor_url: string | null
          remote_inbox_url: string | null
          status: string | null
          type: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          also_known_as?: string[] | null
          created_at?: string
          follower_count?: number | null
          following_count?: number | null
          id?: string
          is_remote?: boolean | null
          manually_approves_followers?: boolean
          moved_to?: string | null
          preferred_username: string
          private_key?: string | null
          public_key?: string | null
          remote_actor_url?: string | null
          remote_inbox_url?: string | null
          status?: string | null
          type?: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          also_known_as?: string[] | null
          created_at?: string
          follower_count?: number | null
          following_count?: number | null
          id?: string
          is_remote?: boolean | null
          manually_approves_followers?: boolean
          moved_to?: string | null
          preferred_username?: string
          private_key?: string | null
          public_key?: string | null
          remote_actor_url?: string | null
          remote_inbox_url?: string | null
          status?: string | null
          type?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_actors_profiles"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_actors_profiles"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      ap_objects: {
        Row: {
          attributed_to: string | null
          company_id: string | null
          content: Json | null
          content_warning: string | null
          created_at: string
          deleted_at: string | null
          id: string
          moderation_reason: string | null
          moderation_revision: string
          moderation_status: string
          published_at: string | null
          remote_object_id: string | null
          type: string
          updated_at: string
        }
        Insert: {
          attributed_to?: string | null
          company_id?: string | null
          content?: Json | null
          content_warning?: string | null
          created_at?: string
          deleted_at?: string | null
          id?: string
          moderation_reason?: string | null
          moderation_revision?: string
          moderation_status?: string
          published_at?: string | null
          remote_object_id?: string | null
          type: string
          updated_at?: string
        }
        Update: {
          attributed_to?: string | null
          company_id?: string | null
          content?: Json | null
          content_warning?: string | null
          created_at?: string
          deleted_at?: string | null
          id?: string
          moderation_reason?: string | null
          moderation_revision?: string
          moderation_status?: string
          published_at?: string | null
          remote_object_id?: string | null
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ap_objects_attributed_to_fkey"
            columns: ["attributed_to"]
            isOneToOne: false
            referencedRelation: "actors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ap_objects_attributed_to_fkey"
            columns: ["attributed_to"]
            isOneToOne: false
            referencedRelation: "follower_batch_stats"
            referencedColumns: ["actor_id"]
          },
          {
            foreignKeyName: "ap_objects_attributed_to_fkey"
            columns: ["attributed_to"]
            isOneToOne: false
            referencedRelation: "public_actors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ap_objects_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      article_authors: {
        Row: {
          article_id: string
          can_edit: boolean | null
          created_at: string
          id: string
          is_primary: boolean | null
          user_id: string
        }
        Insert: {
          article_id: string
          can_edit?: boolean | null
          created_at?: string
          id?: string
          is_primary?: boolean | null
          user_id: string
        }
        Update: {
          article_id?: string
          can_edit?: boolean | null
          created_at?: string
          id?: string
          is_primary?: boolean | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "article_authors_article_id_fkey"
            columns: ["article_id"]
            isOneToOne: false
            referencedRelation: "articles"
            referencedColumns: ["id"]
          },
        ]
      }
      article_reactions: {
        Row: {
          article_id: string
          created_at: string
          emoji: string
          id: string
          user_id: string
        }
        Insert: {
          article_id: string
          created_at?: string
          emoji: string
          id?: string
          user_id: string
        }
        Update: {
          article_id?: string
          created_at?: string
          emoji?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "article_reactions_article_id_fkey"
            columns: ["article_id"]
            isOneToOne: false
            referencedRelation: "articles"
            referencedColumns: ["id"]
          },
        ]
      }
      articles: {
        Row: {
          company_id: string | null
          content: string
          cover_image_url: string | null
          created_at: string
          deleted_at: string | null
          excerpt: string | null
          id: string
          moderation_reason: string | null
          moderation_revision: string
          moderation_status: string
          published: boolean | null
          published_at: string | null
          search_vector: unknown
          slug: string | null
          tags: string[] | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          company_id?: string | null
          content: string
          cover_image_url?: string | null
          created_at?: string
          deleted_at?: string | null
          excerpt?: string | null
          id?: string
          moderation_reason?: string | null
          moderation_revision?: string
          moderation_status?: string
          published?: boolean | null
          published_at?: string | null
          search_vector?: unknown
          slug?: string | null
          tags?: string[] | null
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          company_id?: string | null
          content?: string
          cover_image_url?: string | null
          created_at?: string
          deleted_at?: string | null
          excerpt?: string | null
          id?: string
          moderation_reason?: string | null
          moderation_revision?: string
          moderation_status?: string
          published?: boolean | null
          published_at?: string | null
          search_vector?: unknown
          slug?: string | null
          tags?: string[] | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "articles_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      atproto_auth_locks: {
        Row: {
          expires_at: string
          key_hash: string
          lease_id: string
        }
        Insert: {
          expires_at?: string
          key_hash: string
          lease_id: string
        }
        Update: {
          expires_at?: string
          key_hash?: string
          lease_id?: string
        }
        Relationships: []
      }
      atproto_identities: {
        Row: {
          created_at: string
          did: string
          user_id: string
        }
        Insert: {
          created_at?: string
          did: string
          user_id: string
        }
        Update: {
          created_at?: string
          did?: string
          user_id?: string
        }
        Relationships: []
      }
      atproto_oauth_states: {
        Row: {
          browser_proof_hash: string
          encrypted_state: string
          expires_at: string
          state_hash: string
        }
        Insert: {
          browser_proof_hash: string
          encrypted_state: string
          expires_at?: string
          state_hash: string
        }
        Update: {
          browser_proof_hash?: string
          encrypted_state?: string
          expires_at?: string
          state_hash?: string
        }
        Relationships: []
      }
      auth_request_logs: {
        Row: {
          endpoint: string
          id: string
          ip: string
          timestamp: string
        }
        Insert: {
          endpoint: string
          id?: string
          ip: string
          timestamp?: string
        }
        Update: {
          endpoint?: string
          id?: string
          ip?: string
          timestamp?: string
        }
        Relationships: []
      }
      author_follows: {
        Row: {
          author_id: string
          created_at: string
          follower_id: string
          id: string
          source: string | null
        }
        Insert: {
          author_id: string
          created_at?: string
          follower_id: string
          id?: string
          source?: string | null
        }
        Update: {
          author_id?: string
          created_at?: string
          follower_id?: string
          id?: string
          source?: string | null
        }
        Relationships: []
      }
      blocked_actors: {
        Row: {
          actor_url: string
          created_at: string
          created_by: string | null
          reason: string
          status: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          actor_url: string
          created_at?: string
          created_by?: string | null
          reason: string
          status?: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          actor_url?: string
          created_at?: string
          created_by?: string | null
          reason?: string
          status?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      blocked_domains: {
        Row: {
          created_at: string
          created_by: string | null
          host: string
          reason: string
          status: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          host: string
          reason: string
          status?: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          host?: string
          reason?: string
          status?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      companies: {
        Row: {
          banner_url: string | null
          claim_status: Database["public"]["Enums"]["company_claim_status"]
          created_at: string
          description: string | null
          employee_count: number
          follower_count: number
          founded_year: number | null
          id: string
          industry: string | null
          is_active: boolean
          last_post_at: string | null
          location: string | null
          logo_url: string | null
          name: string
          search_vector: unknown
          size: Database["public"]["Enums"]["company_size"] | null
          slug: string
          tagline: string | null
          updated_at: string
          verified_at: string | null
          verified_method: string | null
          website: string | null
        }
        Insert: {
          banner_url?: string | null
          claim_status?: Database["public"]["Enums"]["company_claim_status"]
          created_at?: string
          description?: string | null
          employee_count?: number
          follower_count?: number
          founded_year?: number | null
          id?: string
          industry?: string | null
          is_active?: boolean
          last_post_at?: string | null
          location?: string | null
          logo_url?: string | null
          name: string
          search_vector?: unknown
          size?: Database["public"]["Enums"]["company_size"] | null
          slug: string
          tagline?: string | null
          updated_at?: string
          verified_at?: string | null
          verified_method?: string | null
          website?: string | null
        }
        Update: {
          banner_url?: string | null
          claim_status?: Database["public"]["Enums"]["company_claim_status"]
          created_at?: string
          description?: string | null
          employee_count?: number
          follower_count?: number
          founded_year?: number | null
          id?: string
          industry?: string | null
          is_active?: boolean
          last_post_at?: string | null
          location?: string | null
          logo_url?: string | null
          name?: string
          search_vector?: unknown
          size?: Database["public"]["Enums"]["company_size"] | null
          slug?: string
          tagline?: string | null
          updated_at?: string
          verified_at?: string | null
          verified_method?: string | null
          website?: string | null
        }
        Relationships: []
 …44531 tokens truncated…/deletionService";
import { getLocalActorUrl, getNoltoInstanceDomain } from "@/lib/federation";
import { createUserActor } from "../federation/actorService";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { processFederatedMentions } from "../federation/federationMentionService";

export interface CreatePostData {
  content: string;
  image?: UploadedPostImage;
  postId?: string;
  imageAltText?: string;
  contentWarning?: string;
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
    if (actorError || !actor?.id) throw actorError || new Error('Account not ready');

    // Fetch profile to include display name in the post content
    const { data: profile } = await supabase
      .from('public_profiles')
      .select('username, fullname')
      .eq('id', user.id)
      .single();
    const actorName = profile?.fullname || profile?.username || actor.preferred_username;

    const imageUrl = postData.image?.url;

    // Create a "Create" activity that wraps the Note or Question object

    if (!actor.preferred_username) throw new Error("Actor username is missing");
    const actorUrl = getLocalActorUrl(actor.preferred_username);
    const baseUrl = `https://${getNoltoInstanceDomain()}`;
    const followersUrl = `${baseUrl}/functions/v1/followers/${actor.preferred_username}`;
    const postId = postData.postId || crypto.randomUUID();

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
        actor: {
          id: actor.id,
          preferredUsername: actor.preferred_username,
          name: actorName
        }
      };
    }

    if (postData.image) noteObject.attachment = [{ type: 'Image', mediaType: postData.image.mediaType,
      url: imageUrl, name: postData.imageAltText || '' }];

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

    const { data: savedPost, error: postError } = await supabase
      .from('ap_objects')
      .insert(postObject)
      .select()
      .single();

    if (postError) {
      const { data: existing } = await supabase.from('ap_objects').select('id,moderation_status').eq('id', postId).eq('attributed_to', actor.id).maybeSingle();
      if (existing) { notifyPublication(existing.moderation_status || 'published', 'Inlägget skapades!'); return true; }
      console.error('Post creation error:', postError);
      toast.error(`Failed to create post: ${postError.message}`);
      return false;
    }

    // A database trigger queues federation in the same transaction as this insert.

    notifyPublication(savedPost.moderation_status, "Inlägget skapades!");
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

    const { data: savedPost, error: updateError } = await supabase
      .from('ap_objects')
      .update({ content: updatedContent })
      .eq('id', postId).select('moderation_status').single();

    if (updateError) {
      console.error('Error updating post:', updateError);
      throw new Error(`Failed to update post: ${updateError.message}`);
    }

    notifyPublication(savedPost.moderation_status, 'Inlägget uppdaterades!');
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
