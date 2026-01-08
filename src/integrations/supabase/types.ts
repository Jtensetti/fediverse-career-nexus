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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      achievements: {
        Row: {
          category: string
          created_at: string
          description: string
          icon: string
          id: string
          name: string
          points: number
        }
        Insert: {
          category?: string
          created_at?: string
          description: string
          icon: string
          id?: string
          name: string
          points?: number
        }
        Update: {
          category?: string
          created_at?: string
          description?: string
          icon?: string
          id?: string
          name?: string
          points?: number
        }
        Relationships: []
      }
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
        ]
      }
      actor_followers: {
        Row: {
          created_at: string
          follower_actor_url: string
          id: string
          local_actor_id: string
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          follower_actor_url: string
          id?: string
          local_actor_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
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
        ]
      }
      actors: {
        Row: {
          created_at: string
          follower_count: number | null
          following_count: number | null
          id: string
          is_remote: boolean | null
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
          created_at?: string
          follower_count?: number | null
          following_count?: number | null
          id?: string
          is_remote?: boolean | null
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
          created_at?: string
          follower_count?: number | null
          following_count?: number | null
          id?: string
          is_remote?: boolean | null
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
          content: Json | null
          created_at: string
          id: string
          published_at: string | null
          type: string
          updated_at: string
        }
        Insert: {
          attributed_to?: string | null
          content?: Json | null
          created_at?: string
          id?: string
          published_at?: string | null
          type: string
          updated_at?: string
        }
        Update: {
          attributed_to?: string | null
          content?: Json | null
          created_at?: string
          id?: string
          published_at?: string | null
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
          content: string
          cover_image_url: string | null
          created_at: string
          excerpt: string | null
          id: string
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
          content: string
          cover_image_url?: string | null
          created_at?: string
          excerpt?: string | null
          id?: string
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
          content?: string
          cover_image_url?: string | null
          created_at?: string
          excerpt?: string | null
          id?: string
          published?: boolean | null
          published_at?: string | null
          search_vector?: unknown
          slug?: string | null
          tags?: string[] | null
          title?: string
          updated_at?: string
          user_id?: string
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
      content_reports: {
        Row: {
          content_id: string
          content_type: string
          created_at: string
          details: string | null
          id: string
          reason: string
          reporter_id: string
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
        }
        Insert: {
          content_id: string
          content_type: string
          created_at?: string
          details?: string | null
          id?: string
          reason: string
          reporter_id: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
        }
        Update: {
          content_id?: string
          content_type?: string
          created_at?: string
          details?: string | null
          id?: string
          reason?: string
          reporter_id?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
        }
        Relationships: []
      }
      cv_sections: {
        Row: {
          content: Json | null
          created_at: string
          display_order: number | null
          id: string
          section_type: string
          title: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          content?: Json | null
          created_at?: string
          display_order?: number | null
          id?: string
          section_type: string
          title?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          content?: Json | null
          created_at?: string
          display_order?: number | null
          id?: string
          section_type?: string
          title?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      education: {
        Row: {
          created_at: string
          degree: string
          end_year: number | null
          field: string | null
          id: string
          institution: string
          start_year: number | null
          updated_at: string
          user_id: string
          verification_status: string | null
          verification_token: string | null
        }
        Insert: {
          created_at?: string
          degree: string
          end_year?: number | null
          field?: string | null
          id?: string
          institution: string
          start_year?: number | null
          updated_at?: string
          user_id: string
          verification_status?: string | null
          verification_token?: string | null
        }
        Update: {
          created_at?: string
          degree?: string
          end_year?: number | null
          field?: string | null
          id?: string
          institution?: string
          start_year?: number | null
          updated_at?: string
          user_id?: string
          verification_status?: string | null
          verification_token?: string | null
        }
        Relationships: []
      }
      email_verification_tokens: {
        Row: {
          expires_at: string
          id: string
          token: string
          used_at: string | null
          user_id: string | null
        }
        Insert: {
          expires_at: string
          id?: string
          token: string
          used_at?: string | null
          user_id?: string | null
        }
        Update: {
          expires_at?: string
          id?: string
          token?: string
          used_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      event_attendees: {
        Row: {
          created_at: string
          event_id: string
          id: string
          status: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          event_id: string
          id?: string
          status?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          event_id?: string
          id?: string
          status?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_attendees_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      event_invitations: {
        Row: {
          created_at: string
          event_id: string
          id: string
          status: string
          user_id: string
        }
        Insert: {
          created_at?: string
          event_id: string
          id?: string
          status?: string
          user_id: string
        }
        Update: {
          created_at?: string
          event_id?: string
          id?: string
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_invitations_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_invitations_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_invitations_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      event_rsvps: {
        Row: {
          created_at: string
          event_id: string
          id: string
          status: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          event_id: string
          id?: string
          status?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          event_id?: string
          id?: string
          status?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_rsvps_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      events: {
        Row: {
          cover_image_url: string | null
          created_at: string
          description: string | null
          end_date: string | null
          id: string
          is_online: boolean | null
          location: string | null
          max_attendees: number | null
          meeting_url: string | null
          search_vector: unknown
          start_date: string
          title: string
          updated_at: string
          user_id: string
          visibility: string | null
        }
        Insert: {
          cover_image_url?: string | null
          created_at?: string
          description?: string | null
          end_date?: string | null
          id?: string
          is_online?: boolean | null
          location?: string | null
          max_attendees?: number | null
          meeting_url?: string | null
          search_vector?: unknown
          start_date: string
          title: string
          updated_at?: string
          user_id: string
          visibility?: string | null
        }
        Update: {
          cover_image_url?: string | null
          created_at?: string
          description?: string | null
          end_date?: string | null
          id?: string
          is_online?: boolean | null
          location?: string | null
          max_attendees?: number | null
          meeting_url?: string | null
          search_vector?: unknown
          start_date?: string
          title?: string
          updated_at?: string
          user_id?: string
          visibility?: string | null
        }
        Relationships: []
      }
      experiences: {
        Row: {
          company: string
          company_domain: string | null
          created_at: string
          description: string | null
          end_date: string | null
          id: string
          is_current_role: boolean | null
          location: string | null
          start_date: string | null
          title: string
          updated_at: string
          user_id: string
          verification_status: string | null
          verification_token: string | null
        }
        Insert: {
          company: string
          company_domain?: string | null
          created_at?: string
          description?: string | null
          end_date?: string | null
          id?: string
          is_current_role?: boolean | null
          location?: string | null
          start_date?: string | null
          title: string
          updated_at?: string
          user_id: string
          verification_status?: string | null
          verification_token?: string | null
        }
        Update: {
          company?: string
          company_domain?: string | null
          created_at?: string
          description?: string | null
          end_date?: string | null
          id?: string
          is_current_role?: boolean | null
          location?: string | null
          start_date?: string | null
          title?: string
          updated_at?: string
          user_id?: string
          verification_status?: string | null
          verification_token?: string | null
        }
        Relationships: []
      }
      federated_sessions: {
        Row: {
          access_token_encrypted: string
          created_at: string | null
          id: string
          last_verified_at: string | null
          profile_id: string | null
          refresh_token_encrypted: string | null
          remote_actor_url: string
          remote_instance: string
          token_expires_at: string | null
          updated_at: string | null
        }
        Insert: {
          access_token_encrypted: string
          created_at?: string | null
          id?: string
          last_verified_at?: string | null
          profile_id?: string | null
          refresh_token_encrypted?: string | null
          remote_actor_url: string
          remote_instance: string
          token_expires_at?: string | null
          updated_at?: string | null
        }
        Update: {
          access_token_encrypted?: string
          created_at?: string | null
          id?: string
          last_verified_at?: string | null
          profile_id?: string | null
          refresh_token_encrypted?: string | null
          remote_actor_url?: string
          remote_instance?: string
          token_expires_at?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "federated_sessions_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "federated_sessions_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      federation_alerts: {
        Row: {
          acknowledged_at: string | null
          alert_type: string
          created_at: string | null
          id: string
          message: string
          metadata: Json | null
          severity: string
        }
        Insert: {
          acknowledged_at?: string | null
          alert_type: string
          created_at?: string | null
          id?: string
          message: string
          metadata?: Json | null
          severity: string
        }
        Update: {
          acknowledged_at?: string | null
          alert_type?: string
          created_at?: string | null
          id?: string
          message?: string
          metadata?: Json | null
          severity?: string
        }
        Relationships: []
      }
      federation_queue_partitioned: {
        Row: {
          activity: Json
          actor_id: string
          attempts: number | null
          created_at: string
          id: string
          last_error: string | null
          partition_key: number
          priority: number | null
          processed_at: string | null
          scheduled_for: string | null
          status: string
        }
        Insert: {
          activity: Json
          actor_id: string
          attempts?: number | null
          created_at?: string
          id?: string
          last_error?: string | null
          partition_key?: number
          priority?: number | null
          processed_at?: string | null
          scheduled_for?: string | null
          status?: string
        }
        Update: {
          activity?: Json
          actor_id?: string
          attempts?: number | null
          created_at?: string
          id?: string
          last_error?: string | null
          partition_key?: number
          priority?: number | null
          processed_at?: string | null
          scheduled_for?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "federation_queue_partitioned_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "actors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "federation_queue_partitioned_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "follower_batch_stats"
            referencedColumns: ["actor_id"]
          },
        ]
      }
      federation_request_logs: {
        Row: {
          endpoint: string
          id: string
          remote_host: string
          request_id: string | null
          request_path: string | null
          timestamp: string
          user_agent: string | null
        }
        Insert: {
          endpoint: string
          id?: string
          remote_host: string
          request_id?: string | null
          request_path?: string | null
          timestamp?: string
          user_agent?: string | null
        }
        Update: {
          endpoint?: string
          id?: string
          remote_host?: string
          request_id?: string | null
          request_path?: string | null
          timestamp?: string
          user_agent?: string | null
        }
        Relationships: []
      }
      follower_batches: {
        Row: {
          actor_id: string
          created_at: string
          followers: Json
          id: string
          processed_at: string | null
          status: string
        }
        Insert: {
          actor_id: string
          created_at?: string
          followers: Json
          id?: string
          processed_at?: string | null
          status?: string
        }
        Update: {
          actor_id?: string
          created_at?: string
          followers?: Json
          id?: string
          processed_at?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "follower_batches_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "actors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "follower_batches_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "follower_batch_stats"
            referencedColumns: ["actor_id"]
          },
        ]
      }
      inbox_items: {
        Row: {
          activity_type: string
          content: Json
          created_at: string
          id: string
          object_type: string | null
          processed_at: string | null
          recipient_id: string
          sender: string
        }
        Insert: {
          activity_type: string
          content: Json
          created_at?: string
          id?: string
          object_type?: string | null
          processed_at?: string | null
          recipient_id: string
          sender: string
        }
        Update: {
          activity_type?: string
          content?: Json
          created_at?: string
          id?: string
          object_type?: string | null
          processed_at?: string | null
          recipient_id?: string
          sender?: string
        }
        Relationships: [
          {
            foreignKeyName: "inbox_items_recipient_id_fkey"
            columns: ["recipient_id"]
            isOneToOne: false
            referencedRelation: "actors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inbox_items_recipient_id_fkey"
            columns: ["recipient_id"]
            isOneToOne: false
            referencedRelation: "follower_batch_stats"
            referencedColumns: ["actor_id"]
          },
        ]
      }
      job_posts: {
        Row: {
          company: string
          created_at: string
          description: string | null
          employment_type: string | null
          experience_level: string | null
          expires_at: string | null
          id: string
          is_active: boolean | null
          location: string | null
          remote_policy: string | null
          salary_currency: string | null
          salary_max: number | null
          salary_min: number | null
          search_vector: unknown
          skills: string[] | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          company: string
          created_at?: string
          description?: string | null
          employment_type?: string | null
          experience_level?: string | null
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          location?: string | null
          remote_policy?: string | null
          salary_currency?: string | null
          salary_max?: number | null
          salary_min?: number | null
          search_vector?: unknown
          skills?: string[] | null
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          company?: string
          created_at?: string
          description?: string | null
          employment_type?: string | null
          experience_level?: string | null
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          location?: string | null
          remote_policy?: string | null
          salary_currency?: string | null
          salary_max?: number | null
          salary_min?: number | null
          search_vector?: unknown
          skills?: string[] | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      messages: {
        Row: {
          content: string
          created_at: string
          id: string
          read_at: string | null
          recipient_id: string
          sender_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          read_at?: string | null
          recipient_id: string
          sender_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          read_at?: string | null
          recipient_id?: string
          sender_id?: string
        }
        Relationships: []
      }
      moderation_actions: {
        Row: {
          created_at: string
          id: string
          is_public: boolean | null
          moderator_id: string
          reason: string | null
          target_user_id: string | null
          type: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_public?: boolean | null
          moderator_id: string
          reason?: string | null
          target_user_id?: string | null
          type: string
        }
        Update: {
          created_at?: string
          id?: string
          is_public?: boolean | null
          moderator_id?: string
          reason?: string | null
          target_user_id?: string | null
          type?: string
        }
        Relationships: []
      }
      newsletter_subscribers: {
        Row: {
          confirm_token: string | null
          confirmed: boolean | null
          created_at: string
          email: string
          id: string
          unsubscribed_at: string | null
        }
        Insert: {
          confirm_token?: string | null
          confirmed?: boolean | null
          created_at?: string
          email: string
          id?: string
          unsubscribed_at?: string | null
        }
        Update: {
          confirm_token?: string | null
          confirmed?: boolean | null
          created_at?: string
          email?: string
          id?: string
          unsubscribed_at?: string | null
        }
        Relationships: []
      }
      notifications: {
        Row: {
          actor_id: string | null
          content: string | null
          created_at: string
          id: string
          object_id: string | null
          object_type: string | null
          read: boolean
          recipient_id: string
          type: string
        }
        Insert: {
          actor_id?: string | null
          content?: string | null
          created_at?: string
          id?: string
          object_id?: string | null
          object_type?: string | null
          read?: boolean
          recipient_id: string
          type: string
        }
        Update: {
          actor_id?: string | null
          content?: string | null
          created_at?: string
          id?: string
          object_id?: string | null
          object_type?: string | null
          read?: boolean
          recipient_id?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_recipient_id_fkey"
            columns: ["recipient_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_recipient_id_fkey"
            columns: ["recipient_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      oauth_clients: {
        Row: {
          client_id: string
          client_secret: string
          created_at: string | null
          id: string
          instance_domain: string
          redirect_uri: string
          scopes: string | null
          updated_at: string | null
        }
        Insert: {
          client_id: string
          client_secret: string
          created_at?: string | null
          id?: string
          instance_domain: string
          redirect_uri: string
          scopes?: string | null
          updated_at?: string | null
        }
        Update: {
          client_id?: string
          client_secret?: string
          created_at?: string | null
          id?: string
          instance_domain?: string
          redirect_uri?: string
          scopes?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      outgoing_follows: {
        Row: {
          created_at: string
          id: string
          local_actor_id: string
          remote_actor_url: string
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          local_actor_id: string
          remote_actor_url: string
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          local_actor_id?: string
          remote_actor_url?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "outgoing_follows_local_actor_id_fkey"
            columns: ["local_actor_id"]
            isOneToOne: false
            referencedRelation: "actors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "outgoing_follows_local_actor_id_fkey"
            columns: ["local_actor_id"]
            isOneToOne: false
            referencedRelation: "follower_batch_stats"
            referencedColumns: ["actor_id"]
          },
        ]
      }
      post_boosts: {
        Row: {
          created_at: string
          id: string
          post_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          post_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          post_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_boosts_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "ap_objects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "post_boosts_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "federated_feed"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "post_boosts_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "federated_posts_with_moderation"
            referencedColumns: ["id"]
          },
        ]
      }
      post_reactions: {
        Row: {
          created_at: string
          emoji: string
          id: string
          post_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          emoji: string
          id?: string
          post_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          emoji?: string
          id?: string
          post_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_reactions_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "ap_objects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "post_reactions_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "federated_feed"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "post_reactions_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "federated_posts_with_moderation"
            referencedColumns: ["id"]
          },
        ]
      }
      post_replies: {
        Row: {
          content: string
          created_at: string
          id: string
          post_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          post_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          post_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_replies_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "ap_objects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "post_replies_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "federated_feed"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "post_replies_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "federated_posts_with_moderation"
            referencedColumns: ["id"]
          },
        ]
      }
      profile_views: {
        Row: {
          created_at: string
          id: string
          profile_id: string
          viewer_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          profile_id: string
          viewer_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          profile_id?: string
          viewer_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profile_views_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profile_views_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          auth_type: string | null
          avatar_url: string | null
          bio: string | null
          created_at: string
          domain: string | null
          fullname: string | null
          header_url: string | null
          headline: string | null
          home_instance: string | null
          id: string
          is_verified: boolean | null
          location: string | null
          phone: string | null
          profile_views: number | null
          remote_actor_url: string | null
          search_vector: unknown
          updated_at: string
          username: string | null
        }
        Insert: {
          auth_type?: string | null
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          domain?: string | null
          fullname?: string | null
          header_url?: string | null
          headline?: string | null
          home_instance?: string | null
          id: string
          is_verified?: boolean | null
          location?: string | null
          phone?: string | null
          profile_views?: number | null
          remote_actor_url?: string | null
          search_vector?: unknown
          updated_at?: string
          username?: string | null
        }
        Update: {
          auth_type?: string | null
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          domain?: string | null
          fullname?: string | null
          header_url?: string | null
          headline?: string | null
          home_instance?: string | null
          id?: string
          is_verified?: boolean | null
          location?: string | null
          phone?: string | null
          profile_views?: number | null
          remote_actor_url?: string | null
          search_vector?: unknown
          updated_at?: string
          username?: string | null
        }
        Relationships: []
      }
      recommendations: {
        Row: {
          content: string
          created_at: string
          id: string
          position_at_time: string | null
          recipient_id: string
          recommender_id: string
          relationship: string
          status: string
          updated_at: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          position_at_time?: string | null
          recipient_id: string
          recommender_id: string
          relationship: string
          status?: string
          updated_at?: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          position_at_time?: string | null
          recipient_id?: string
          recommender_id?: string
          relationship?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "recommendations_recipient_id_fkey"
            columns: ["recipient_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recommendations_recipient_id_fkey"
            columns: ["recipient_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recommendations_recommender_id_fkey"
            columns: ["recommender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recommendations_recommender_id_fkey"
            columns: ["recommender_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      referrals: {
        Row: {
          converted_at: string | null
          created_at: string
          id: string
          referral_code: string
          referred_email: string | null
          referred_user_id: string | null
          referrer_id: string
          reward_claimed: boolean | null
          status: string
        }
        Insert: {
          converted_at?: string | null
          created_at?: string
          id?: string
          referral_code: string
          referred_email?: string | null
          referred_user_id?: string | null
          referrer_id: string
          reward_claimed?: boolean | null
          status?: string
        }
        Update: {
          converted_at?: string | null
          created_at?: string
          id?: string
          referral_code?: string
          referred_email?: string | null
          referred_user_id?: string | null
          referrer_id?: string
          reward_claimed?: boolean | null
          status?: string
        }
        Relationships: []
      }
      remote_actors_cache: {
        Row: {
          actor_data: Json
          actor_url: string
          created_at: string
          expires_at: string | null
          hit_count: number | null
          id: string
          last_accessed_at: string | null
        }
        Insert: {
          actor_data: Json
          actor_url: string
          created_at?: string
          expires_at?: string | null
          hit_count?: number | null
          id?: string
          last_accessed_at?: string | null
        }
        Update: {
          actor_data?: Json
          actor_url?: string
          created_at?: string
          expires_at?: string | null
          hit_count?: number | null
          id?: string
          last_accessed_at?: string | null
        }
        Relationships: []
      }
      remote_instances: {
        Row: {
          created_at: string
          error_count_24h: number | null
          first_seen_at: string
          health_score: number | null
          host: string
          id: string
          last_error_at: string | null
          last_seen_at: string | null
          reason: string | null
          request_count_24h: number | null
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          error_count_24h?: number | null
          first_seen_at?: string
          health_score?: number | null
          host: string
          id?: string
          last_error_at?: string | null
          last_seen_at?: string | null
          reason?: string | null
          request_count_24h?: number | null
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          error_count_24h?: number | null
          first_seen_at?: string
          health_score?: number | null
          host?: string
          id?: string
          last_error_at?: string | null
          last_seen_at?: string | null
          reason?: string | null
          request_count_24h?: number | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      saved_items: {
        Row: {
          created_at: string
          id: string
          item_id: string
          item_type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          item_id: string
          item_type: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          item_id?: string
          item_type?: string
          user_id?: string
        }
        Relationships: []
      }
      server_keys: {
        Row: {
          created_at: string
          id: string
          is_current: boolean | null
          private_key: string
          public_key: string
          revoked_at: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          is_current?: boolean | null
          private_key: string
          public_key: string
          revoked_at?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          is_current?: boolean | null
          private_key?: string
          public_key?: string
          revoked_at?: string | null
        }
        Relationships: []
      }
      skill_endorsements: {
        Row: {
          created_at: string
          endorser_id: string
          id: string
          skill_id: string
        }
        Insert: {
          created_at?: string
          endorser_id: string
          id?: string
          skill_id: string
        }
        Update: {
          created_at?: string
          endorser_id?: string
          id?: string
          skill_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "skill_endorsements_endorser_id_fkey"
            columns: ["endorser_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "skill_endorsements_endorser_id_fkey"
            columns: ["endorser_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "skill_endorsements_skill_id_fkey"
            columns: ["skill_id"]
            isOneToOne: false
            referencedRelation: "skills"
            referencedColumns: ["id"]
          },
        ]
      }
      skills: {
        Row: {
          created_at: string
          endorsements: number | null
          id: string
          name: string
          user_id: string
        }
        Insert: {
          created_at?: string
          endorsements?: number | null
          id?: string
          name: string
          user_id: string
        }
        Update: {
          created_at?: string
          endorsements?: number | null
          id?: string
          name?: string
          user_id?: string
        }
        Relationships: []
      }
      user_achievements: {
        Row: {
          achievement_id: string
          id: string
          unlocked_at: string
          user_id: string
        }
        Insert: {
          achievement_id: string
          id?: string
          unlocked_at?: string
          user_id: string
        }
        Update: {
          achievement_id?: string
          id?: string
          unlocked_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_achievements_achievement_id_fkey"
            columns: ["achievement_id"]
            isOneToOne: false
            referencedRelation: "achievements"
            referencedColumns: ["id"]
          },
        ]
      }
      user_blocks: {
        Row: {
          blocked_user_id: string
          blocker_id: string
          created_at: string
          id: string
          reason: string | null
        }
        Insert: {
          blocked_user_id: string
          blocker_id: string
          created_at?: string
          id?: string
          reason?: string | null
        }
        Update: {
          blocked_user_id?: string
          blocker_id?: string
          created_at?: string
          id?: string
          reason?: string | null
        }
        Relationships: []
      }
      user_connections: {
        Row: {
          connected_user_id: string
          created_at: string
          id: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          connected_user_id: string
          created_at?: string
          id?: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          connected_user_id?: string
          created_at?: string
          id?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_user_connections_connected_user_id"
            columns: ["connected_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_user_connections_connected_user_id"
            columns: ["connected_user_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_user_connections_user_id"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_user_connections_user_id"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      user_settings: {
        Row: {
          created_at: string
          id: string
          show_network_connections: boolean | null
          theme: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          show_network_connections?: boolean | null
          theme?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          show_network_connections?: boolean | null
          theme?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      federated_feed: {
        Row: {
          attributed_to: string | null
          content: Json | null
          id: string | null
          published_at: string | null
          source: string | null
          type: string | null
        }
        Insert: {
          attributed_to?: string | null
          content?: Json | null
          id?: string | null
          published_at?: string | null
          source?: never
          type?: string | null
        }
        Update: {
          attributed_to?: string | null
          content?: Json | null
          id?: string | null
          published_at?: string | null
          source?: never
          type?: string | null
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
        ]
      }
      federated_posts_with_moderation: {
        Row: {
          attributed_to: string | null
          content: Json | null
          id: string | null
          moderation_status: string | null
          published_at: string | null
          source: string | null
          type: string | null
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
        ]
      }
      federation_queue_stats: {
        Row: {
          failed_count: number | null
          partition_key: number | null
          pending_count: number | null
          processed_count: number | null
          processing_count: number | null
          total_count: number | null
        }
        Relationships: []
      }
      follower_batch_stats: {
        Row: {
          actor_id: string | null
          pending_batches: number | null
          preferred_username: string | null
          processed_batches: number | null
          total_batches: number | null
        }
        Relationships: []
      }
      public_profiles: {
        Row: {
          auth_type: string | null
          avatar_url: string | null
          bio: string | null
          created_at: string | null
          domain: string | null
          fullname: string | null
          header_url: string | null
          headline: string | null
          home_instance: string | null
          id: string | null
          is_verified: boolean | null
          location: string | null
          phone: string | null
          profile_views: number | null
          remote_actor_url: string | null
          search_vector: unknown
          updated_at: string | null
          username: string | null
        }
        Insert: {
          auth_type?: string | null
          avatar_url?: string | null
          bio?: string | null
          created_at?: string | null
          domain?: string | null
          fullname?: string | null
          header_url?: string | null
          headline?: string | null
          home_instance?: string | null
          id?: string | null
          is_verified?: boolean | null
          location?: string | null
          phone?: never
          profile_views?: number | null
          remote_actor_url?: string | null
          search_vector?: never
          updated_at?: string | null
          username?: string | null
        }
        Update: {
          auth_type?: string | null
          avatar_url?: string | null
          bio?: string | null
          created_at?: string | null
          domain?: string | null
          fullname?: string | null
          header_url?: string | null
          headline?: string | null
          home_instance?: string | null
          id?: string | null
          is_verified?: boolean | null
          location?: string | null
          phone?: never
          profile_views?: number | null
          remote_actor_url?: string | null
          search_vector?: never
          updated_at?: string | null
          username?: string | null
        }
        Relationships: []
      }
      server_public_keys: {
        Row: {
          created_at: string | null
          id: string | null
          is_current: boolean | null
          public_key: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string | null
          is_current?: boolean | null
          public_key?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string | null
          is_current?: boolean | null
          public_key?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      actor_id_to_partition_key: {
        Args: { actor_uuid: string }
        Returns: number
      }
      are_users_connected: {
        Args: { user1: string; user2: string }
        Returns: boolean
      }
      are_users_connected_secure: {
        Args: { user1: string; user2: string }
        Returns: boolean
      }
      check_host_rate_limit: {
        Args: { p_max_requests_per_minute?: number; p_remote_host: string }
        Returns: boolean
      }
      cleanup_expired_actor_cache: { Args: never; Returns: undefined }
      create_federation_alert: {
        Args: {
          p_message: string
          p_metadata?: Json
          p_severity: string
          p_type: string
        }
        Returns: string
      }
      create_follow: {
        Args: { p_local_actor_id: string; p_remote_actor_url: string }
        Returns: string
      }
      create_follower_batches: {
        Args: { p_actor_id: string; p_batch_size?: number; p_followers: Json }
        Returns: number
      }
      ensure_actor_has_keys: { Args: { actor_uuid: string }; Returns: boolean }
      generate_referral_code: { Args: never; Returns: string }
      get_connection_degree: {
        Args: { source_user_id: string; target_user_id: string }
        Returns: number
      }
      get_current_public_key: { Args: never; Returns: string }
      get_event_owner: { Args: { p_event_id: string }; Returns: string }
      get_federation_health: {
        Args: never
        Returns: {
          avg_processing_time_ms: number
          oldest_pending_age_minutes: number
          total_failed: number
          total_pending: number
          total_processing: number
        }[]
      }
      get_federation_queue_stats: {
        Args: never
        Returns: {
          failed_count: number
          partition_key: number
          pending_count: number
          processed_count: number
          processing_count: number
          total_count: number
        }[]
      }
      get_follower_batch_stats: {
        Args: never
        Returns: {
          pending_batches: number
          processed_batches: number
          total_batches: number
        }[]
      }
      get_rate_limited_hosts: {
        Args: { request_threshold: number; window_start: string }
        Returns: {
          latest_request: string
          remote_host: string
          request_count: number
        }[]
      }
      get_smart_suggestions: {
        Args: { p_limit?: number; p_user_id: string }
        Returns: {
          avatar_url: string
          fullname: string
          headline: string
          is_verified: boolean
          mutual_count: number
          suggestion_reason: string
          user_id: string
          username: string
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin: { Args: { _user_id: string }; Returns: boolean }
      is_moderator: { Args: { _user_id: string }; Returns: boolean }
      is_user_blocked: {
        Args: { checker_id: string; target_id: string }
        Returns: boolean
      }
      is_user_invited_to_event: {
        Args: { p_event_id: string; p_user_id: string }
        Returns: boolean
      }
      update_instance_health: {
        Args: { p_host: string; p_success: boolean }
        Returns: undefined
      }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
      verification_status: "unverified" | "pending" | "verified" | "rejected"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "moderator", "user"],
      verification_status: ["unverified", "pending", "verified", "rejected"],
    },
  },
} as const
