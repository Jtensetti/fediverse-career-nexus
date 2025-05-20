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
      actors: {
        Row: {
          created_at: string
          id: string
          inbox_url: string | null
          outbox_url: string | null
          preferred_username: string
          private_key: string | null
          public_key: string | null
          type: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          inbox_url?: string | null
          outbox_url?: string | null
          preferred_username: string
          private_key?: string | null
          public_key?: string | null
          type?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          inbox_url?: string | null
          outbox_url?: string | null
          preferred_username?: string
          private_key?: string | null
          public_key?: string | null
          type?: string | null
          user_id?: string | null
        }
        Relationships: []
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
          created_at: string
          fullname: string | null
          id: string
          updated_at: string
          username: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          fullname?: string | null
          id: string
          updated_at?: string
          username?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          fullname?: string | null
          id?: string
          updated_at?: string
          username?: string | null
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
      [_ in never]: never
    }
    Functions: {
      can_initiate_conversation: {
        Args: { user1_id: string; user2_id: string }
        Returns: boolean
      }
      create_conversation: {
        Args: { other_user_id: string }
        Returns: string
      }
      generate_verification_token: {
        Args: { length?: number }
        Returns: string
      }
      get_connection_degree: {
        Args: { source_user_id: string; target_user_id: string }
        Returns: number
      }
      is_admin: {
        Args: { user_id: string }
        Returns: boolean
      }
      is_moderator: {
        Args: { user_id: string }
        Returns: boolean
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
