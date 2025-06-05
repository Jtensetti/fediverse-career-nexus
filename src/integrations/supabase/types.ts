export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      actor_followers: {
        Row: {
          created_at: string
          follower_actor_id: string | null
          follower_actor_url: string
          id: string
          local_actor_id: string
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          follower_actor_id?: string | null
          follower_actor_url: string
          id?: string
          local_actor_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          follower_actor_id?: string | null
          follower_actor_url?: string
          id?: string
          local_actor_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "actor_followers_follower_actor_id_fkey"
            columns: ["follower_actor_id"]
            isOneToOne: false
            referencedRelation: "actors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "actor_followers_local_actor_id_fkey"
            columns: ["local_actor_id"]
            isOneToOne: false
            referencedRelation: "actors"
            referencedColumns: ["id"]
          },
        ]
      }
      actors: {
        Row: {
          created_at: string
          follower_count: number
          id: string
          inbox_url: string | null
          key_fingerprint: string | null
          outbox_url: string | null
          preferred_username: string
          private_key: string | null
          public_key: string | null
          status: string
          type: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          follower_count?: number
          id?: string
          inbox_url?: string | null
          key_fingerprint?: string | null
          outbox_url?: string | null
          preferred_username: string
          private_key?: string | null
          public_key?: string | null
          status?: string
          type?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          follower_count?: number
          id?: string
          inbox_url?: string | null
          key_fingerprint?: string | null
          outbox_url?: string | null
          preferred_username?: string
          private_key?: string | null
          public_key?: string | null
          status?: string
          type?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      ap_objects: {
        Row: {
          attributed_to: string | null
          content: Json
          created_at: string
          id: string
          published_at: string
          type: string
          updated_at: string
        }
        Insert: {
          attributed_to?: string | null
          content: Json
          created_at?: string
          id?: string
          published_at?: string
          type: string
          updated_at?: string
        }
        Update: {
          attributed_to?: string | null
          content?: Json
          created_at?: string
          id?: string
          published_at?: string
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
        ]
      }
      article_authors: {
        Row: {
          article_id: string
          can_edit: boolean
          created_at: string
          id: string
          is_primary: boolean
          user_id: string
        }
        Insert: {
          article_id: string
          can_edit?: boolean
          created_at?: string
          id?: string
          is_primary?: boolean
          user_id: string
        }
        Update: {
          article_id?: string
          can_edit?: boolean
          created_at?: string
          id?: string
          is_primary?: boolean
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
          {
            foreignKeyName: "article_authors_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
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
          created_at: string
          excerpt: string | null
          id: string
          published: boolean
          published_at: string | null
          slug: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          excerpt?: string | null
          id?: string
          published?: boolean
          published_at?: string | null
          slug: string
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          excerpt?: string | null
          id?: string
          published?: boolean
          published_at?: string | null
          slug?: string
          title?: string
          updated_at?: string
          user_id?: string
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
          status: string
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
      conversation_participants: {
        Row: {
          conversation_id: string
          encryption_public_key: string | null
          id: string
          is_active: boolean
          joined_at: string
          left_at: string | null
          user_id: string
        }
        Insert: {
          conversation_id: string
          encryption_public_key?: string | null
          id?: string
          is_active?: boolean
          joined_at?: string
          left_at?: string | null
          user_id: string
        }
        Update: {
          conversation_id?: string
          encryption_public_key?: string | null
          id?: string
          is_active?: boolean
          joined_at?: string
          left_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversation_participants_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      conversations: {
        Row: {
          created_at: string
          id: string
          last_message_at: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          last_message_at?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          last_message_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      direct_messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string
          deleted_at: string | null
          encrypted_content: string | null
          id: string
          is_encrypted: boolean
          read_at: string | null
          sender_id: string
          updated_at: string
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string
          deleted_at?: string | null
          encrypted_content?: string | null
          id?: string
          is_encrypted?: boolean
          read_at?: string | null
          sender_id: string
          updated_at?: string
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string
          deleted_at?: string | null
          encrypted_content?: string | null
          id?: string
          is_encrypted?: boolean
          read_at?: string | null
          sender_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "direct_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      education: {
        Row: {
          created_at: string
          degree: string
          end_year: number | null
          field: string
          id: string
          institution: string
          start_year: number
          updated_at: string
          user_id: string
          verification_date: string | null
          verification_status:
            | Database["public"]["Enums"]["verification_status"]
            | null
          verification_token: string | null
        }
        Insert: {
          created_at?: string
          degree: string
          end_year?: number | null
          field: string
          id?: string
          institution: string
          start_year: number
          updated_at?: string
          user_id: string
          verification_date?: string | null
          verification_status?:
            | Database["public"]["Enums"]["verification_status"]
            | null
          verification_token?: string | null
        }
        Update: {
          created_at?: string
          degree?: string
          end_year?: number | null
          field?: string
          id?: string
          institution?: string
          start_year?: number
          updated_at?: string
          user_id?: string
          verification_date?: string | null
          verification_status?:
            | Database["public"]["Enums"]["verification_status"]
            | null
          verification_token?: string | null
        }
        Relationships: []
      }
      event_rsvps: {
        Row: {
          created_at: string
          event_id: string
          id: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          event_id: string
          id?: string
          status: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          event_id?: string
          id?: string
          status?: string
          updated_at?: string
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
          capacity: number | null
          created_at: string
          description: string
          end_time: string
          id: string
          image_url: string | null
          is_public: boolean
          is_virtual: boolean
          location: string | null
          start_time: string
          stream_type: string | null
          stream_url: string | null
          timezone: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          capacity?: number | null
          created_at?: string
          description: string
          end_time: string
          id?: string
          image_url?: string | null
          is_public?: boolean
          is_virtual?: boolean
          location?: string | null
          start_time: string
          stream_type?: string | null
          stream_url?: string | null
          timezone?: string
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          capacity?: number | null
          created_at?: string
          description?: string
          end_time?: string
          id?: string
          image_url?: string | null
          is_public?: boolean
          is_virtual?: boolean
          location?: string | null
          start_time?: string
          stream_type?: string | null
          stream_url?: string | null
          timezone?: string
          title?: string
          updated_at?: string
          user_id?: string
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
          start_date: string
          title: string
          updated_at: string
          user_id: string
          verification_date: string | null
          verification_status:
            | Database["public"]["Enums"]["verification_status"]
            | null
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
          start_date: string
          title: string
          updated_at?: string
          user_id: string
          verification_date?: string | null
          verification_status?:
            | Database["public"]["Enums"]["verification_status"]
            | null
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
          start_date?: string
          title?: string
          updated_at?: string
          user_id?: string
          verification_date?: string | null
          verification_status?:
            | Database["public"]["Enums"]["verification_status"]
            | null
          verification_token?: string | null
        }
        Relationships: []
      }
      federation_queue: {
        Row: {
          activity: Json
          actor_id: string
          attempts: number
          created_at: string
          id: string
          last_attempted_at: string | null
          next_attempt_at: string | null
          status: string
        }
        Insert: {
          activity: Json
          actor_id: string
          attempts?: number
          created_at?: string
          id?: string
          last_attempted_at?: string | null
          next_attempt_at?: string | null
          status?: string
        }
        Update: {
          activity?: Json
          actor_id?: string
          attempts?: number
          created_at?: string
          id?: string
          last_attempted_at?: string | null
          next_attempt_at?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "federation_queue_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "actors"
            referencedColumns: ["id"]
          },
        ]
      }
      federation_queue_partition_0: {
        Row: {
          activity: Json
          actor_id: string
          attempts: number
          created_at: string
          id: string
          last_attempted_at: string | null
          next_attempt_at: string | null
          partition_key: number
          status: string
        }
        Insert: {
          activity: Json
          actor_id: string
          attempts?: number
          created_at?: string
          id?: string
          last_attempted_at?: string | null
          next_attempt_at?: string | null
          partition_key: number
          status?: string
        }
        Update: {
          activity?: Json
          actor_id?: string
          attempts?: number
          created_at?: string
          id?: string
          last_attempted_at?: string | null
          next_attempt_at?: string | null
          partition_key?: number
          status?: string
        }
        Relationships: []
      }
      federation_queue_partition_1: {
        Row: {
          activity: Json
          actor_id: string
          attempts: number
          created_at: string
          id: string
          last_attempted_at: string | null
          next_attempt_at: string | null
          partition_key: number
          status: string
        }
        Insert: {
          activity: Json
          actor_id: string
          attempts?: number
          created_at?: string
          id?: string
          last_attempted_at?: string | null
          next_attempt_at?: string | null
          partition_key: number
          status?: string
        }
        Update: {
          activity?: Json
          actor_id?: string
          attempts?: number
          created_at?: string
          id?: string
          last_attempted_at?: string | null
          next_attempt_at?: string | null
          partition_key?: number
          status?: string
        }
        Relationships: []
      }
      federation_queue_partition_2: {
        Row: {
          activity: Json
          actor_id: string
          attempts: number
          created_at: string
          id: string
          last_attempted_at: string | null
          next_attempt_at: string | null
          partition_key: number
          status: string
        }
        Insert: {
          activity: Json
          actor_id: string
          attempts?: number
          created_at?: string
          id?: string
          last_attempted_at?: string | null
          next_attempt_at?: string | null
          partition_key: number
          status?: string
        }
        Update: {
          activity?: Json
          actor_id?: string
          attempts?: number
          created_at?: string
          id?: string
          last_attempted_at?: string | null
          next_attempt_at?: string | null
          partition_key?: number
          status?: string
        }
        Relationships: []
      }
      federation_queue_partition_3: {
        Row: {
          activity: Json
          actor_id: string
          attempts: number
          created_at: string
          id: string
          last_attempted_at: string | null
          next_attempt_at: string | null
          partition_key: number
          status: string
        }
        Insert: {
          activity: Json
          actor_id: string
          attempts?: number
          created_at?: string
          id?: string
          last_attempted_at?: string | null
          next_attempt_at?: string | null
          partition_key: number
          status?: string
        }
        Update: {
          activity?: Json
          actor_id?: string
          attempts?: number
          created_at?: string
          id?: string
          last_attempted_at?: string | null
          next_attempt_at?: string | null
          partition_key?: number
          status?: string
        }
        Relationships: []
      }
      federation_queue_partitioned: {
        Row: {
          activity: Json
          actor_id: string
          attempts: number
          created_at: string
          id: string
          last_attempted_at: string | null
          next_attempt_at: string | null
          partition_key: number
          status: string
        }
        Insert: {
          activity: Json
          actor_id: string
          attempts?: number
          created_at?: string
          id?: string
          last_attempted_at?: string | null
          next_attempt_at?: string | null
          partition_key: number
          status?: string
        }
        Update: {
          activity?: Json
          actor_id?: string
          attempts?: number
          created_at?: string
          id?: string
          last_attempted_at?: string | null
          next_attempt_at?: string | null
          partition_key?: number
          status?: string
        }
        Relationships: []
      }
      federation_request_logs: {
        Row: {
          endpoint: string
          error_message: string | null
          id: string
          remote_host: string
          response_time_ms: number
          status_code: number | null
          success: boolean
          timestamp: string
        }
        Insert: {
          endpoint: string
          error_message?: string | null
          id?: string
          remote_host: string
          response_time_ms: number
          status_code?: number | null
          success: boolean
          timestamp?: string
        }
        Update: {
          endpoint?: string
          error_message?: string | null
          id?: string
          remote_host?: string
          response_time_ms?: number
          status_code?: number | null
          success?: boolean
          timestamp?: string
        }
        Relationships: []
      }
      follower_batches: {
        Row: {
          activity: Json
          actor_id: string
          attempts: number
          batch_size: number
          batch_targets: Json[]
          created_at: string
          id: string
          last_attempted_at: string | null
          next_attempt_at: string | null
          partition_key: number
          status: string
        }
        Insert: {
          activity: Json
          actor_id: string
          attempts?: number
          batch_size?: number
          batch_targets: Json[]
          created_at?: string
          id?: string
          last_attempted_at?: string | null
          next_attempt_at?: string | null
          partition_key: number
          status?: string
        }
        Update: {
          activity?: Json
          actor_id?: string
          attempts?: number
          batch_size?: number
          batch_targets?: Json[]
          created_at?: string
          id?: string
          last_attempted_at?: string | null
          next_attempt_at?: string | null
          partition_key?: number
          status?: string
        }
        Relationships: []
      }
      inbox_events: {
        Row: {
          activity: Json
          created_at: string
          id: string
          processed_at: string | null
          recipient_id: string
          sender: string
          signature_verified: boolean
          status: string
        }
        Insert: {
          activity: Json
          created_at?: string
          id?: string
          processed_at?: string | null
          recipient_id: string
          sender: string
          signature_verified?: boolean
          status?: string
        }
        Update: {
          activity?: Json
          created_at?: string
          id?: string
          processed_at?: string | null
          recipient_id?: string
          sender?: string
          signature_verified?: boolean
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "inbox_events_recipient_id_fkey"
            columns: ["recipient_id"]
            isOneToOne: false
            referencedRelation: "actors"
            referencedColumns: ["id"]
          },
        ]
      }
      job_posts: {
        Row: {
          application_url: string | null
          company_name: string
          company_verified: boolean
          contact_email: string | null
          created_at: string
          description: string
          id: string
          job_type: Database["public"]["Enums"]["job_type"]
          location: string
          published: boolean
          published_at: string | null
          remote_allowed: boolean
          salary_currency: string | null
          salary_max: number | null
          salary_min: number | null
          skills: string[]
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          application_url?: string | null
          company_name: string
          company_verified?: boolean
          contact_email?: string | null
          created_at?: string
          description: string
          id?: string
          job_type: Database["public"]["Enums"]["job_type"]
          location: string
          published?: boolean
          published_at?: string | null
          remote_allowed?: boolean
          salary_currency?: string | null
          salary_max?: number | null
          salary_min?: number | null
          skills?: string[]
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          application_url?: string | null
          company_name?: string
          company_verified?: boolean
          contact_email?: string | null
          created_at?: string
          description?: string
          id?: string
          job_type?: Database["public"]["Enums"]["job_type"]
          location?: string
          published?: boolean
          published_at?: string | null
          remote_allowed?: boolean
          salary_currency?: string | null
          salary_max?: number | null
          salary_min?: number | null
          skills?: string[]
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      moderation_actions: {
        Row: {
          created_at: string
          id: string
          is_public: boolean
          moderator_id: string
          reason: string
          target_user_id: string
          type: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_public?: boolean
          moderator_id: string
          reason: string
          target_user_id: string
          type: string
        }
        Update: {
          created_at?: string
          id?: string
          is_public?: boolean
          moderator_id?: string
          reason?: string
          target_user_id?: string
          type?: string
        }
        Relationships: []
      }
      newsletter_subscriptions: {
        Row: {
          email: string
          id: string
          is_active: boolean
          subscribed_at: string
          unsubscribed_at: string | null
          user_id: string
        }
        Insert: {
          email: string
          id?: string
          is_active?: boolean
          subscribed_at?: string
          unsubscribed_at?: string | null
          user_id: string
        }
        Update: {
          email?: string
          id?: string
          is_active?: boolean
          subscribed_at?: string
          unsubscribed_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      outgoing_follows: {
        Row: {
          created_at: string
          follow_activity_id: string
          id: string
          local_actor_id: string
          remote_actor_uri: string
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          follow_activity_id: string
          id?: string
          local_actor_id: string
          remote_actor_uri: string
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          follow_activity_id?: string
          id?: string
          local_actor_id?: string
          remote_actor_uri?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      profile_views: {
        Row: {
          id: string
          opted_in: boolean
          viewed_at: string
          viewed_id: string
          viewer_id: string | null
        }
        Insert: {
          id?: string
          opted_in?: boolean
          viewed_at?: string
          viewed_id: string
          viewer_id?: string | null
        }
        Update: {
          id?: string
          opted_in?: boolean
          viewed_at?: string
          viewed_id?: string
          viewer_id?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          created_at: string
          domain: string | null
          fullname: string | null
          headline: string | null
          id: string
          is_verified: boolean | null
          location: string | null
          phone: string | null
          profile_views: number | null
          updated_at: string
          username: string | null
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          domain?: string | null
          fullname?: string | null
          headline?: string | null
          id: string
          is_verified?: boolean | null
          location?: string | null
          phone?: string | null
          profile_views?: number | null
          updated_at?: string
          username?: string | null
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          domain?: string | null
          fullname?: string | null
          headline?: string | null
          id?: string
          is_verified?: boolean | null
          location?: string | null
          phone?: string | null
          profile_views?: number | null
          updated_at?: string
          username?: string | null
        }
        Relationships: []
      }
      remote_actors_cache: {
        Row: {
          actor_data: Json
          actor_url: string
          fetched_at: string
        }
        Insert: {
          actor_data: Json
          actor_url: string
          fetched_at?: string
        }
        Update: {
          actor_data?: Json
          actor_url?: string
          fetched_at?: string
        }
        Relationships: []
      }
      remote_keys: {
        Row: {
          fetched_at: string
          key_id: string
          pem: string
        }
        Insert: {
          fetched_at?: string
          key_id: string
          pem: string
        }
        Update: {
          fetched_at?: string
          key_id?: string
          pem?: string
        }
        Relationships: []
      }
      server_keys: {
        Row: {
          algorithm: string
          created_at: string
          id: string
          is_current: boolean
          key_id: string
          key_size: number
          private_key: string
          public_key: string
          revoked_at: string | null
        }
        Insert: {
          algorithm?: string
          created_at?: string
          id?: string
          is_current?: boolean
          key_id: string
          key_size?: number
          private_key: string
          public_key: string
          revoked_at?: string | null
        }
        Update: {
          algorithm?: string
          created_at?: string
          id?: string
          is_current?: boolean
          key_id?: string
          key_size?: number
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
          endorsements: number
          id: string
          name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          endorsements?: number
          id?: string
          name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          endorsements?: number
          id?: string
          name?: string
          updated_at?: string
          user_id?: string
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
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: string
          user_id?: string
        }
        Relationships: []
      }
      user_settings: {
        Row: {
          created_at: string
          show_network_connections: boolean
          show_profile_visitors: boolean
          theme: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          show_network_connections?: boolean
          show_profile_visitors?: boolean
          theme?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          show_network_connections?: boolean
          show_profile_visitors?: boolean
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
        Relationships: []
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
        Relationships: []
      }
      federation_metrics_by_host: {
        Row: {
          failed_requests: number | null
          median_latency_ms: number | null
          remote_host: string | null
          success_percent: number | null
          total_requests: number | null
        }
        Relationships: []
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
          failed_count: number | null
          partition_key: number | null
          pending_count: number | null
          processed_count: number | null
          processing_count: number | null
          total_count: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      actor_id_to_partition_key: {
        Args: { actor_id: string }
        Returns: number
      }
      can_initiate_conversation: {
        Args: { user1_id: string; user2_id: string }
        Returns: boolean
      }
      cleanup_expired_actor_cache: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      create_conversation: {
        Args: { other_user_id: string }
        Returns: string
      }
      create_follow: {
        Args: { local_actor_id: string; remote_actor_uri: string }
        Returns: string
      }
      create_follower_batches: {
        Args: { p_actor_id: string; p_activity: Json; p_batch_size?: number }
        Returns: number
      }
      ensure_actor_has_keys: {
        Args: { actor_uuid: string }
        Returns: boolean
      }
      generate_verification_token: {
        Args: { length?: number }
        Returns: string
      }
      get_connection_degree: {
        Args: { source_user_id: string; target_user_id: string }
        Returns: number
      }
      get_current_server_key: {
        Args: Record<PropertyKey, never>
        Returns: {
          id: string
          key_id: string
          public_key: string
          private_key: string
        }[]
      }
      get_domain_moderation_status: {
        Args: { domain: string }
        Returns: string
      }
      get_federation_queue_stats: {
        Args: Record<PropertyKey, never>
        Returns: {
          partition_key: number
          total_count: number
          pending_count: number
          processing_count: number
          failed_count: number
          processed_count: number
        }[]
      }
      get_follower_batch_stats: {
        Args: Record<PropertyKey, never>
        Returns: {
          partition_key: number
          total_count: number
          pending_count: number
          processing_count: number
          failed_count: number
          processed_count: number
        }[]
      }
      get_rate_limited_hosts: {
        Args: { window_start: string; request_threshold: number }
        Returns: {
          remote_host: string
          request_count: number
          latest_request: string
        }[]
      }
      handle_inbox_event: {
        Args: { event_id: string }
        Returns: boolean
      }
      is_admin: {
        Args: { user_id: string }
        Returns: boolean
      }
      is_moderator: {
        Args: { user_id: string }
        Returns: boolean
      }
      migrate_federation_queue_data: {
        Args: Record<PropertyKey, never>
        Returns: number
      }
      process_pending_inbox_events: {
        Args: { batch_size?: number }
        Returns: number
      }
      proxy_remote_media: {
        Args: { url: string }
        Returns: string
      }
      request_education_verification: {
        Args: { education_id: string }
        Returns: string
      }
      request_experience_verification: {
        Args: { experience_id: string }
        Returns: string
      }
    }
    Enums: {
      job_type:
        | "full_time"
        | "part_time"
        | "contract"
        | "internship"
        | "temporary"
      verification_status: "unverified" | "pending" | "verified" | "rejected"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DefaultSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      job_type: [
        "full_time",
        "part_time",
        "contract",
        "internship",
        "temporary",
      ],
      verification_status: ["unverified", "pending", "verified", "rejected"],
    },
  },
} as const
