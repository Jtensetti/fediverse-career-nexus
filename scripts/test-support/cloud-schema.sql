-- Schema-only snapshot of Lovable Cloud on 2026-09-21. Contains no user records, keys or credentials.
-- Local regression fixture; never apply to a live database.
SET check_function_bodies = false;

CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role BYPASSRLS; CREATE ROLE supabase_auth_admin;
CREATE SCHEMA auth; CREATE SCHEMA storage;

CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql AS $$ SELECT nullif(current_setting('test.uid',true),'')::uuid $$;
CREATE FUNCTION auth.role() RETURNS text LANGUAGE sql AS $$ SELECT nullif(current_setting('test.role',true),'') $$;
CREATE FUNCTION auth.jwt() RETURNS jsonb LANGUAGE sql AS $$ SELECT coalesce(nullif(current_setting('test.jwt',true),''),'{}')::jsonb $$;
CREATE TABLE auth.users (id uuid PRIMARY KEY, email text, email_confirmed_at timestamptz, raw_user_meta_data jsonb DEFAULT '{}',created_at timestamptz DEFAULT now());
CREATE TABLE auth.sessions (id uuid PRIMARY KEY,user_id uuid REFERENCES auth.users ON DELETE CASCADE,not_after timestamptz);
CREATE TABLE auth.mfa_factors (id uuid PRIMARY KEY,user_id uuid REFERENCES auth.users ON DELETE CASCADE,status text);
CREATE TABLE storage.objects (id uuid PRIMARY KEY,bucket_id text,name text,owner uuid,owner_id text,metadata jsonb,created_at timestamptz DEFAULT now());
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;
GRANT USAGE ON SCHEMA public,auth,storage TO anon,authenticated,service_role;


CREATE TYPE public."app_role" AS ENUM ('admin','moderator','user');

CREATE TYPE public."claim_request_status" AS ENUM ('pending','approved','rejected');

CREATE TYPE public."company_claim_status" AS ENUM ('unclaimed','claimed','disputed','verified');

CREATE TYPE public."company_role" AS ENUM ('owner','admin','editor');

CREATE TYPE public."company_size" AS ENUM ('1-10','11-50','51-200','201-500','501-1000','1001-5000','5001-10000','10000+');

CREATE TYPE public."employment_type" AS ENUM ('full_time','part_time','contract','intern','freelance');

CREATE TYPE public."section_visibility" AS ENUM ('everyone','logged_in','connections');

CREATE TYPE public."verification_status" AS ENUM ('unverified','pending','verified','rejected');

CREATE TABLE public."company_roles" (
  "company_id" uuid NOT NULL,
  "user_id" uuid NOT NULL,
  "role" public."company_role" NOT NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "id" uuid DEFAULT gen_random_uuid() NOT NULL
);

ALTER TABLE public."company_roles" ENABLE ROW LEVEL SECURITY;

CREATE TABLE public."blocked_domains" (
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "created_by" uuid,
  "updated_at" timestamptz DEFAULT now() NOT NULL,
  "updated_by" uuid,
  "host" text NOT NULL,
  "status" text DEFAULT 'blocked'::text NOT NULL,
  "reason" text NOT NULL
);

ALTER TABLE public."blocked_domains" ENABLE ROW LEVEL SECURITY;

CREATE TABLE public."federation_alerts" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "metadata" jsonb DEFAULT '{}'::jsonb,
  "acknowledged_at" timestamptz,
  "created_at" timestamptz DEFAULT now(),
  "alert_type" text NOT NULL,
  "severity" text NOT NULL,
  "message" text NOT NULL
);

ALTER TABLE public."federation_alerts" ENABLE ROW LEVEL SECURITY;

CREATE TABLE public."event_rsvps" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "event_id" uuid NOT NULL,
  "user_id" uuid NOT NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "status" text DEFAULT 'going'::text
);

ALTER TABLE public."event_rsvps" ENABLE ROW LEVEL SECURITY;

CREATE TABLE public."saved_items" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL,
  "item_id" uuid NOT NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "item_type" text NOT NULL
);

ALTER TABLE public."saved_items" ENABLE ROW LEVEL SECURITY;

CREATE TABLE public."user_settings" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL,
  "show_network_connections" bool DEFAULT true,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL,
  "theme" text DEFAULT 'system'::text
);

ALTER TABLE public."user_settings" ENABLE ROW LEVEL SECURITY;

CREATE TABLE public."skill_endorsements" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "skill_id" uuid NOT NULL,
  "endorser_id" uuid NOT NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE public."skill_endorsements" ENABLE ROW LEVEL SECURITY;

CREATE TABLE public."author_follows" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "follower_id" uuid NOT NULL,
  "author_id" uuid NOT NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "source" text DEFAULT 'manual'::text
);

ALTER TABLE public."author_follows" ENABLE ROW LEVEL SECURITY;

CREATE TABLE public."company_audit_log" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "company_id" uuid NOT NULL,
  "actor_user_id" uuid NOT NULL,
  "metadata" jsonb,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "action" text NOT NULL
);

ALTER TABLE public."company_audit_log" ENABLE ROW LEVEL SECURITY;

CREATE TABLE public."articles" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL,
  "published" bool DEFAULT false,
  "published_at" timestamptz,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL,
  "search_vector" tsvector,
  "company_id" uuid,
  "title" text NOT NULL,
  "content" text NOT NULL,
  "excerpt" text,
  "cover_image_url" text,
  "slug" text,
  "tags" text[]
);

ALTER TABLE public."articles" ENABLE ROW LEVEL SECURITY;

CREATE TABLE public."mfa_recovery_requests" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid,
  "handled_by" uuid,
  "handled_at" timestamptz,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL,
  "email" text NOT NULL,
  "username" text,
  "message" text,
  "status" text DEFAULT 'pending'::text NOT NULL,
  "admin_notes" text,
  "ip_address" text,
  "user_agent" text,
  "attempted_login_email" text
);

ALTER TABLE public."mfa_recovery_requests" ENABLE ROW LEVEL SECURITY;

CREATE TABLE public."federated_sessions" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "profile_id" uuid,
  "token_expires_at" timestamptz,
  "last_verified_at" timestamptz DEFAULT now(),
  "created_at" timestamptz DEFAULT now(),
  "updated_at" timestamptz DEFAULT now(),
  "remote_actor_url" text NOT NULL,
  "remote_instance" text NOT NULL,
  "access_token_encrypted" text NOT NULL,
  "refresh_token_encrypted" text
);

ALTER TABLE public."federated_sessions" ENABLE ROW LEVEL SECURITY;

CREATE TABLE public."post_replies" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "post_id" uuid NOT NULL,
  "user_id" uuid NOT NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL,
  "content" text NOT NULL
);

ALTER TABLE public."post_replies" ENABLE ROW LEVEL SECURITY;

CREATE TABLE public."server_keys" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "is_current" bool DEFAULT true,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "revoked_at" timestamptz,
  "public_key" text NOT NULL,
  "private_key" text NOT NULL
);

ALTER TABLE public."server_keys" ENABLE ROW LEVEL SECURITY;

CREATE TABLE public."site_alerts" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "is_active" bool DEFAULT true NOT NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL,
  "message" text NOT NULL,
  "type" text DEFAULT 'success'::text NOT NULL
);

ALTER TABLE public."site_alerts" ENABLE ROW LEVEL SECURITY;

CREATE TABLE public."events" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL,
  "start_date" timestamptz NOT NULL,
  "end_date" timestamptz,
  "is_online" bool DEFAULT false,
  "max_attendees" int4,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL,
  "search_vector" tsvector,
  "title" text NOT NULL,
  "description" text,
  "location" text,
  "cover_image_url" text,
  "meeting_url" text,
  "visibility" text DEFAULT 'public'::text
);

ALTER TABLE public."events" ENABLE ROW LEVEL SECURITY;

CREATE TABLE public."user_consents" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL,
  "consented_at" timestamptz DEFAULT now() NOT NULL,
  "withdrawn_at" timestamptz,
  "consent_type" text NOT NULL,
  "version" text NOT NULL,
  "ip_address" text,
  "user_agent" text
);

ALTER TABLE public."user_consents" ENABLE ROW LEVEL SECURITY;

CREATE TABLE public."recommendations" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "recommender_id" uuid NOT NULL,
  "recipient_id" uuid NOT NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL,
  "relationship" text NOT NULL,
  "position_at_time" text,
  "content" text NOT NULL,
  "status" text DEFAULT 'pending'::text NOT NULL
);

ALTER TABLE public."recommendations" ENABLE ROW LEVEL SECURITY;

CREATE TABLE public."profiles" (
  "id" uuid NOT NULL,
  "is_verified" bool DEFAULT false,
  "profile_views" int4 DEFAULT 0,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL,
  "search_vector" tsvector,
  "is_freelancer" bool DEFAULT false,
  "email_digest_enabled" bool DEFAULT true,
  "username" text,
  "fullname" text,
  "headline" text,
  "bio" text,
  "avatar_url" text,
  "phone" text,
  "location" text,
  "domain" text,
  "auth_type" text DEFAULT 'local'::text,
  "remote_actor_url" text,
  "home_instance" text,
  "header_url" text,
  "dm_privacy" text DEFAULT 'connections'::text,
  "freelancer_skills" text[],
  "freelancer_rate" text,
  "freelancer_availability" text,
  "website" text,
  "contact_email" text
);

ALTER TABLE public."profiles" ENABLE ROW LEVEL SECURITY;

CREATE TABLE public."profile_views" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "profile_id" uuid NOT NULL,
  "viewer_id" uuid,
  "created_at" timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE public."profile_views" ENABLE ROW LEVEL SECURITY;

CREATE TABLE public."follower_batches" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "actor_id" uuid NOT NULL,
  "followers" jsonb NOT NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "processed_at" timestamptz,
  "status" text DEFAULT 'pending'::text NOT NULL
);

ALTER TABLE public."follower_batches" ENABLE ROW LEVEL SECURITY;

CREATE TABLE public."referrals" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "referrer_id" uuid NOT NULL,
  "referred_user_id" uuid,
  "reward_claimed" bool DEFAULT false,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "converted_at" timestamptz,
  "referred_email" text,
  "referral_code" text NOT NULL,
  "status" text DEFAULT 'pending'::text NOT NULL
);

ALTER TABLE public."referrals" ENABLE ROW LEVEL SECURITY;

CREATE TABLE public."moderation_actions" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "target_user_id" uuid,
  "moderator_id" uuid NOT NULL,
  "is_public" bool DEFAULT false,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "expires_at" timestamptz,
  "type" text NOT NULL,
  "reason" text,
  "target_content_type" text,
  "target_content_id" text
);

ALTER TABLE public."moderation_actions" ENABLE ROW LEVEL SECURITY;

CREATE TABLE public."article_authors" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "article_id" uuid NOT NULL,
  "user_id" uuid NOT NULL,
  "is_primary" bool DEFAULT false,
  "can_edit" bool DEFAULT true,
  "created_at" timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE public."article_authors" ENABLE ROW LEVEL SECURITY;

CREATE TABLE public."message_requests" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "sender_id" uuid NOT NULL,
  "recipient_id" uuid NOT NULL,
  "created_at" timestamptz DEFAULT now(),
  "responded_at" timestamptz,
  "preview_text" text,
  "intro_template" text,
  "status" text DEFAULT 'pending'::text
);

ALTER TABLE public."message_requests" ENABLE ROW LEVEL SECURITY;

CREATE TABLE public."company_claim_requests" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "company_id" uuid NOT NULL,
  "requester_user_id" uuid NOT NULL,
  "status" public."claim_request_status" DEFAULT 'pending'::claim_request_status NOT NULL,
  "evidence" jsonb,
  "reviewed_by" uuid,
  "reviewed_at" timestamptz,
  "created_at" timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE public."company_claim_requests" ENABLE ROW LEVEL SECURITY;

CREATE TABLE public."custom_feeds" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL,
  "rules" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "is_public" bool DEFAULT false,
  "position" int4 DEFAULT 0,
  "created_at" timestamptz DEFAULT now(),
  "updated_at" timestamptz DEFAULT now(),
  "name" text NOT NULL,
  "description" text,
  "icon" text DEFAULT 'filter'::text
);

ALTER TABLE public."custom_feeds" ENABLE ROW LEVEL SECURITY;

CREATE TABLE public."cv_sections" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL,
  "content" jsonb,
  "display_order" int4 DEFAULT 0,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL,
  "section_type" text NOT NULL,
  "title" text
);

ALTER TABLE public."cv_sections" ENABLE ROW LEVEL SECURITY;

CREATE TABLE public."inbox_items" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "recipient_id" uuid NOT NULL,
  "content" jsonb NOT NULL,
  "processed_at" timestamptz,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "sender" text NOT NULL,
  "activity_type" text NOT NULL,
  "object_type" text
);

ALTER TABLE public."inbox_items" ENABLE ROW LEVEL SECURITY;

CREATE TABLE public."blocked_actors" (
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "created_by" uuid,
  "updated_at" timestamptz DEFAULT now() NOT NULL,
  "updated_by" uuid,
  "reason" text NOT NULL,
  "actor_url" text NOT NULL,
  "status" text DEFAULT 'blocked'::text NOT NULL
);

ALTER TABLE public."blocked_actors" ENABLE ROW LEVEL SECURITY;

CREATE TABLE public."oauth_clients" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "created_at" timestamptz DEFAULT now(),
  "updated_at" timestamptz DEFAULT now(),
  "instance_domain" text NOT NULL,
  "client_id" text NOT NULL,
  "client_secret" text NOT NULL,
  "redirect_uri" text NOT NULL,
  "scopes" text DEFAULT 'read'::text
);

ALTER TABLE public."oauth_clients" ENABLE ROW LEVEL SECURITY;

CREATE TABLE public."skills" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL,
  "endorsements" int4 DEFAULT 0,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "name" text NOT NULL
);

ALTER TABLE public."skills" ENABLE ROW LEVEL SECURITY;

CREATE TABLE public."company_employees" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "company_id" uuid NOT NULL,
  "user_id" uuid NOT NULL,
  "employment_type" public."employment_type" DEFAULT 'full_time'::employment_type NOT NULL,
  "start_date" date NOT NULL,
  "end_date" date,
  "is_verified" bool DEFAULT false NOT NULL,
  "verified_at" timestamptz,
  "verified_by" uuid,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL,
  "title" text NOT NULL
);

ALTER TABLE public."company_employees" ENABLE ROW LEVEL SECURITY;

CREATE TABLE public."federation_signature_cache" (
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "signature_hash" text NOT NULL
);

ALTER TABLE public."federation_signature_cache" ENABLE ROW LEVEL SECURITY;

CREATE TABLE public."mfa_recovery_tokens" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL,
  "expires_at" timestamptz NOT NULL,
  "used_at" timestamptz,
  "created_by_admin_id" uuid,
  "request_id" uuid,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "token_hash" text NOT NULL
);

ALTER TABLE public."mfa_recovery_tokens" ENABLE ROW LEVEL SECURITY;

CREATE TABLE public."user_bans" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL,
  "banned_by" uuid NOT NULL,
  "expires_at" timestamptz,
  "created_at" timestamptz DEFAULT now(),
  "revoked_at" timestamptz,
  "revoked_by" uuid,
  "reason" text NOT NULL
);

ALTER TABLE public."user_bans" ENABLE ROW LEVEL SECURITY;

CREATE TABLE public."newsletter_subscribers" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "confirmed" bool DEFAULT false,
  "unsubscribed_at" timestamptz,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "email" text NOT NULL,
  "confirm_token" text
);

ALTER TABLE public."newsletter_subscribers" ENABLE ROW LEVEL SECURITY;

CREATE TABLE public."actors" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid,
  "follower_count" int4 DEFAULT 0,
  "following_count" int4 DEFAULT 0,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL,
  "is_remote" bool DEFAULT false,
  "manually_approves_followers" bool DEFAULT false NOT NULL,
  "preferred_username" text NOT NULL,
  "type" text DEFAULT 'Person'::text NOT NULL,
  "status" text DEFAULT 'active'::text,
  "private_key" text,
  "public_key" text,
  "remote_actor_url" text,
  "remote_inbox_url" text,
  "also_known_as" text[] DEFAULT '{}'::text[],
  "moved_to" text
);

ALTER TABLE public."actors" ENABLE ROW LEVEL SECURITY;

CREATE TABLE public."article_reactions" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "article_id" uuid NOT NULL,
  "user_id" uuid NOT NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "emoji" text NOT NULL
);

ALTER TABLE public."article_reactions" ENABLE ROW LEVEL SECURITY;

CREATE TABLE public."user_followed_packs" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL,
  "pack_id" uuid NOT NULL,
  "followed_at" timestamptz DEFAULT now()
);

ALTER TABLE public."user_followed_packs" ENABLE ROW LEVEL SECURITY;

CREATE TABLE public."education" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL,
  "start_year" int4,
  "end_year" int4,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL,
  "institution" text NOT NULL,
  "degree" text NOT NULL,
  "field" text,
  "verification_status" text DEFAULT 'unverified'::text,
  "verification_token" text
);

ALTER TABLE public."education" ENABLE ROW LEVEL SECURITY;

CREATE TABLE public."starter_pack_members" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "pack_id" uuid NOT NULL,
  "user_id" uuid NOT NULL,
  "added_by" uuid,
  "added_at" timestamptz DEFAULT now()
);

ALTER TABLE public."starter_pack_members" ENABLE ROW LEVEL SECURITY;

CREATE TABLE public."event_invitations" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "event_id" uuid NOT NULL,
  "user_id" uuid NOT NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "status" text DEFAULT 'pending'::text NOT NULL
);

ALTER TABLE public."event_invitations" ENABLE ROW LEVEL SECURITY;

CREATE TABLE public."ap_objects" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "attributed_to" uuid,
  "content" jsonb,
  "published_at" timestamptz DEFAULT now(),
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL,
  "company_id" uuid,
  "type" text NOT NULL,
  "content_warning" text
);

ALTER TABLE public."ap_objects" ENABLE ROW LEVEL SECURITY;

CREATE TABLE public."reactions" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "target_id" uuid NOT NULL,
  "user_id" uuid NOT NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL,
  "target_type" text NOT NULL,
  "reaction" text NOT NULL
);

ALTER TABLE public."reactions" ENABLE ROW LEVEL SECURITY;

CREATE TABLE public."experiences" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL,
  "is_current_role" bool DEFAULT false,
  "start_date" date,
  "end_date" date,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL,
  "title" text NOT NULL,
  "company" text NOT NULL,
  "location" text,
  "description" text,
  "verification_status" text DEFAULT 'unverified'::text,
  "verification_token" text,
  "company_domain" text
);

ALTER TABLE public."experiences" ENABLE ROW LEVEL SECURITY;

CREATE TABLE public."company_followers" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "company_id" uuid NOT NULL,
  "user_id" uuid NOT NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE public."company_followers" ENABLE ROW LEVEL SECURITY;

CREATE TABLE public."user_roles" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL,
  "role" public."app_role" NOT NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE public."user_roles" ENABLE ROW LEVEL SECURITY;

CREATE TABLE public."companies" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "size" public."company_size",
  "founded_year" int4,
  "claim_status" public."company_claim_status" DEFAULT 'unclaimed'::company_claim_status NOT NULL,
  "verified_at" timestamptz,
  "is_active" bool DEFAULT true NOT NULL,
  "follower_count" int4 DEFAULT 0 NOT NULL,
  "employee_count" int4 DEFAULT 0 NOT NULL,
  "last_post_at" timestamptz,
  "search_vector" tsvector,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL,
  "slug" text NOT NULL,
  "name" text NOT NULL,
  "tagline" text,
  "description" text,
  "logo_url" text,
  "banner_url" text,
  "website" text,
  "industry" text,
  "location" text,
  "verified_method" text
);

ALTER TABLE public."companies" ENABLE ROW LEVEL SECURITY;

CREATE TABLE public."poll_votes" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "poll_id" uuid NOT NULL,
  "user_id" uuid NOT NULL,
  "option_index" int4 NOT NULL,
  "created_at" timestamptz DEFAULT now()
);

ALTER TABLE public."poll_votes" ENABLE ROW LEVEL SECURITY;

CREATE TABLE public."email_verification_tokens" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid,
  "expires_at" timestamptz NOT NULL,
  "used_at" timestamptz,
  "token" text NOT NULL
);

ALTER TABLE public."email_verification_tokens" ENABLE ROW LEVEL SECURITY;

CREATE TABLE public."auth_request_logs" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "timestamp" timestamptz DEFAULT now() NOT NULL,
  "ip" text NOT NULL,
  "endpoint" text NOT NULL
);

ALTER TABLE public."auth_request_logs" ENABLE ROW LEVEL SECURITY;

CREATE TABLE public."job_conversations" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "job_post_id" uuid NOT NULL,
  "applicant_id" uuid NOT NULL,
  "poster_id" uuid NOT NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE public."job_conversations" ENABLE ROW LEVEL SECURITY;

CREATE TABLE public."password_reset_codes" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "expires_at" timestamptz NOT NULL,
  "used" bool DEFAULT false,
  "created_at" timestamptz DEFAULT now(),
  "email" text NOT NULL,
  "code" text NOT NULL
);

ALTER TABLE public."password_reset_codes" ENABLE ROW LEVEL SECURITY;

CREATE TABLE public."notification_digest_tracking" (
  "user_id" uuid NOT NULL,
  "last_digest_sent_at" timestamptz,
  "last_notification_check_at" timestamptz,
  "created_at" timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE public."notification_digest_tracking" ENABLE ROW LEVEL SECURITY;

CREATE TABLE public."actor_followers" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "local_actor_id" uuid NOT NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL,
  "follower_actor_url" text NOT NULL,
  "status" text DEFAULT 'pending'::text NOT NULL
);

ALTER TABLE public."actor_followers" ENABLE ROW LEVEL SECURITY;

CREATE TABLE public."content_reports" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "reporter_id" uuid NOT NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "reviewed_at" timestamptz,
  "reviewed_by" uuid,
  "content_type" text NOT NULL,
  "content_id" text NOT NULL,
  "reason" text NOT NULL,
  "details" text,
  "status" text DEFAULT 'pending'::text NOT NULL
);

ALTER TABLE public."content_reports" ENABLE ROW LEVEL SECURITY;

CREATE TABLE public."federation_request_logs" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "timestamp" timestamptz DEFAULT now() NOT NULL,
  "remote_host" text NOT NULL,
  "endpoint" text NOT NULL,
  "request_path" text,
  "user_agent" text,
  "request_id" text
);

ALTER TABLE public."federation_request_logs" ENABLE ROW LEVEL SECURITY;

CREATE TABLE public."job_posts" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL,
  "salary_min" int4,
  "salary_max" int4,
  "is_active" bool DEFAULT true,
  "expires_at" timestamptz,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL,
  "search_vector" tsvector,
  "visa_sponsorship" bool DEFAULT false,
  "transparency_score" int4 DEFAULT 0,
  "company_id" uuid,
  "title" text NOT NULL,
  "company" text NOT NULL,
  "description" text,
  "location" text,
  "remote_policy" text DEFAULT 'on-site'::text,
  "salary_currency" text DEFAULT 'USD'::text,
  "employment_type" text DEFAULT 'full-time'::text,
  "experience_level" text,
  "skills" text[],
  "interview_process" text,
  "response_time" text,
  "team_size" text,
  "growth_path" text,
  "application_url" text,
  "contact_email" text
);

ALTER TABLE public."job_posts" ENABLE ROW LEVEL SECURITY;

CREATE TABLE public."starter_packs" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "creator_id" uuid,
  "is_featured" bool DEFAULT false,
  "member_count" int4 DEFAULT 0,
  "follower_count" int4 DEFAULT 0,
  "created_at" timestamptz DEFAULT now(),
  "updated_at" timestamptz DEFAULT now(),
  "name" text NOT NULL,
  "slug" text NOT NULL,
  "description" text,
  "category" text DEFAULT 'community'::text,
  "cover_image_url" text
);

ALTER TABLE public."starter_packs" ENABLE ROW LEVEL SECURITY;

CREATE TABLE public."activities" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "actor_id" uuid,
  "payload" jsonb NOT NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "type" text NOT NULL
);

ALTER TABLE public."activities" ENABLE ROW LEVEL SECURITY;

CREATE TABLE public."messages" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "sender_id" uuid NOT NULL,
  "recipient_id" uuid NOT NULL,
  "read_at" timestamptz,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "is_federated" bool DEFAULT false,
  "is_encrypted" bool DEFAULT false,
  "job_conversation_id" uuid,
  "content" text NOT NULL,
  "federated_activity_id" text,
  "remote_sender_url" text,
  "remote_recipient_url" text,
  "delivery_status" text DEFAULT 'local'::text,
  "encrypted_content" text
);

ALTER TABLE public."messages" ENABLE ROW LEVEL SECURITY;

CREATE TABLE public."reserved_company_slugs" (
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "slug" text NOT NULL,
  "reason" text
);

ALTER TABLE public."reserved_company_slugs" ENABLE ROW LEVEL SECURITY;

CREATE TABLE public."user_connections" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL,
  "connected_user_id" uuid NOT NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL,
  "status" text DEFAULT 'pending'::text NOT NULL
);

ALTER TABLE public."user_connections" ENABLE ROW LEVEL SECURITY;

CREATE TABLE public."webfinger_cache" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "created_at" timestamptz DEFAULT now(),
  "expires_at" timestamptz DEFAULT (now() + '01:00:00'::interval),
  "hit_count" int4 DEFAULT 0,
  "acct" text NOT NULL,
  "actor_url" text NOT NULL,
  "inbox_url" text
);

ALTER TABLE public."webfinger_cache" ENABLE ROW LEVEL SECURITY;

CREATE TABLE public."user_blocks" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "blocker_id" uuid NOT NULL,
  "blocked_user_id" uuid NOT NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "reason" text
);

ALTER TABLE public."user_blocks" ENABLE ROW LEVEL SECURITY;

CREATE TABLE public."notifications" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "recipient_id" uuid NOT NULL,
  "actor_id" uuid,
  "read" bool DEFAULT false NOT NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "type" text NOT NULL,
  "content" text,
  "object_id" text,
  "object_type" text
);

ALTER TABLE public."notifications" ENABLE ROW LEVEL SECURITY;

CREATE TABLE public."outgoing_follows" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "local_actor_id" uuid NOT NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL,
  "status" text DEFAULT 'pending'::text NOT NULL,
  "remote_actor_url" text NOT NULL
);

ALTER TABLE public."outgoing_follows" ENABLE ROW LEVEL SECURITY;

CREATE TABLE public."remote_actors_cache" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "actor_data" jsonb NOT NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "expires_at" timestamptz DEFAULT (now() + '1 day'::interval),
  "hit_count" int4 DEFAULT 0,
  "last_accessed_at" timestamptz DEFAULT now(),
  "actor_url" text NOT NULL
);

ALTER TABLE public."remote_actors_cache" ENABLE ROW LEVEL SECURITY;

CREATE TABLE public."profile_section_visibility" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL,
  "visibility" public."section_visibility" DEFAULT 'everyone'::section_visibility NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL,
  "section" text NOT NULL
);

ALTER TABLE public."profile_section_visibility" ENABLE ROW LEVEL SECURITY;

CREATE TABLE public."federation_queue_partitioned" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "actor_id" uuid NOT NULL,
  "activity" jsonb NOT NULL,
  "partition_key" int4 DEFAULT 0 NOT NULL,
  "attempts" int4 DEFAULT 0,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "processed_at" timestamptz,
  "priority" int4 DEFAULT 5,
  "scheduled_for" timestamptz DEFAULT now(),
  "next_retry_at" timestamptz DEFAULT now(),
  "max_attempts" int4 DEFAULT 10,
  "status" text DEFAULT 'pending'::text NOT NULL,
  "last_error" text
);

ALTER TABLE public."federation_queue_partitioned" ENABLE ROW LEVEL SECURITY;

CREATE TABLE public."remote_instances" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "first_seen_at" timestamptz DEFAULT now() NOT NULL,
  "last_seen_at" timestamptz DEFAULT now(),
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL,
  "health_score" int4 DEFAULT 100,
  "request_count_24h" int4 DEFAULT 0,
  "last_error_at" timestamptz,
  "error_count_24h" int4 DEFAULT 0,
  "host" text NOT NULL,
  "status" text DEFAULT 'active'::text NOT NULL,
  "reason" text
);

ALTER TABLE public."remote_instances" ENABLE ROW LEVEL SECURITY;

CREATE TABLE public."user_feed_preferences" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL,
  "show_reposts" bool DEFAULT true,
  "show_replies" bool DEFAULT false,
  "created_at" timestamptz DEFAULT now(),
  "updated_at" timestamptz DEFAULT now(),
  "default_feed" text DEFAULT 'following'::text,
  "language_filter" text[],
  "muted_words" text[] DEFAULT ARRAY[]::text[]
);

ALTER TABLE public."user_feed_preferences" ENABLE ROW LEVEL SECURITY;

ALTER TABLE public."mfa_recovery_tokens" ADD CONSTRAINT "mfa_recovery_tokens_pkey" PRIMARY KEY (id);

ALTER TABLE public."mfa_recovery_tokens" ADD CONSTRAINT "mfa_recovery_tokens_token_hash_key" UNIQUE (token_hash);

ALTER TABLE public."federation_signature_cache" ADD CONSTRAINT "federation_signature_cache_pkey" PRIMARY KEY (signature_hash);

ALTER TABLE public."ap_objects" ADD CONSTRAINT "ap_objects_pkey" PRIMARY KEY (id);

ALTER TABLE public."articles" ADD CONSTRAINT "articles_pkey" PRIMARY KEY (id);

ALTER TABLE public."user_roles" ADD CONSTRAINT "user_roles_pkey" PRIMARY KEY (id);

ALTER TABLE public."user_roles" ADD CONSTRAINT "user_roles_user_id_role_key" UNIQUE (user_id, role);

ALTER TABLE public."profiles" ADD CONSTRAINT "profiles_pkey" PRIMARY KEY (id);

ALTER TABLE public."profiles" ADD CONSTRAINT "profiles_username_key" UNIQUE (username);

ALTER TABLE public."actors" ADD CONSTRAINT "actors_pkey" PRIMARY KEY (id);

ALTER TABLE public."federation_request_logs" ADD CONSTRAINT "federation_request_logs_pkey" PRIMARY KEY (id);

ALTER TABLE public."auth_request_logs" ADD CONSTRAINT "auth_request_logs_pkey" PRIMARY KEY (id);

ALTER TABLE public."email_verification_tokens" ADD CONSTRAINT "email_verification_tokens_pkey" PRIMARY KEY (id);

ALTER TABLE public."remote_instances" ADD CONSTRAINT "remote_instances_pkey" PRIMARY KEY (id);

ALTER TABLE public."remote_instances" ADD CONSTRAINT "remote_instances_host_key" UNIQUE (host);

ALTER TABLE public."articles" ADD CONSTRAINT "articles_slug_key" UNIQUE (slug);

ALTER TABLE public."article_reactions" ADD CONSTRAINT "article_reactions_pkey" PRIMARY KEY (id);

ALTER TABLE public."article_reactions" ADD CONSTRAINT "article_reactions_article_id_user_id_emoji_key" UNIQUE (article_id, user_id, emoji);

ALTER TABLE public."server_keys" ADD CONSTRAINT "server_keys_pkey" PRIMARY KEY (id);

ALTER TABLE public."user_settings" ADD CONSTRAINT "user_settings_pkey" PRIMARY KEY (id);

ALTER TABLE public."user_settings" ADD CONSTRAINT "user_settings_user_id_key" UNIQUE (user_id);

ALTER TABLE public."user_connections" ADD CONSTRAINT "user_connections_pkey" PRIMARY KEY (id);

ALTER TABLE public."user_connections" ADD CONSTRAINT "user_connections_user_id_connected_user_id_key" UNIQUE (user_id, connected_user_id);

ALTER TABLE public."moderation_actions" ADD CONSTRAINT "moderation_actions_pkey" PRIMARY KEY (id);

ALTER TABLE public."profile_views" ADD CONSTRAINT "profile_views_pkey" PRIMARY KEY (id);

ALTER TABLE public."outgoing_follows" ADD CONSTRAINT "outgoing_follows_pkey" PRIMARY KEY (id);

ALTER TABLE public."outgoing_follows" ADD CONSTRAINT "outgoing_follows_local_actor_id_remote_actor_url_key" UNIQUE (local_actor_id, remote_actor_url);

ALTER TABLE public."remote_actors_cache" ADD CONSTRAINT "remote_actors_cache_pkey" PRIMARY KEY (id);

ALTER TABLE public."remote_actors_cache" ADD CONSTRAINT "remote_actors_cache_actor_url_key" UNIQUE (actor_url);

ALTER TABLE public."federation_queue_partitioned" ADD CONSTRAINT "federation_queue_partitioned_pkey" PRIMARY KEY (id);

ALTER TABLE public."follower_batches" ADD CONSTRAINT "follower_batches_pkey" PRIMARY KEY (id);

ALTER TABLE public."experiences" ADD CONSTRAINT "experiences_pkey" PRIMARY KEY (id);

ALTER TABLE public."education" ADD CONSTRAINT "education_pkey" PRIMARY KEY (id);

ALTER TABLE public."skills" ADD CONSTRAINT "skills_pkey" PRIMARY KEY (id);

ALTER TABLE public."blocked_actors" ADD CONSTRAINT "blocked_actors_pkey" PRIMARY KEY (actor_url);

ALTER TABLE public."blocked_domains" ADD CONSTRAINT "blocked_domains_pkey" PRIMARY KEY (host);

ALTER TABLE public."activities" ADD CONSTRAINT "activities_pkey" PRIMARY KEY (id);

ALTER TABLE public."events" ADD CONSTRAINT "events_pkey" PRIMARY KEY (id);

ALTER TABLE public."job_posts" ADD CONSTRAINT "job_posts_pkey" PRIMARY KEY (id);

ALTER TABLE public."messages" ADD CONSTRAINT "messages_pkey" PRIMARY KEY (id);

ALTER TABLE public."newsletter_subscribers" ADD CONSTRAINT "newsletter_subscribers_pkey" PRIMARY KEY (id);

ALTER TABLE public."newsletter_subscribers" ADD CONSTRAINT "newsletter_subscribers_email_key" UNIQUE (email);

ALTER TABLE public."post_replies" ADD CONSTRAINT "post_replies_pkey" PRIMARY KEY (id);

ALTER TABLE public."cv_sections" ADD CONSTRAINT "cv_sections_pkey" PRIMARY KEY (id);

ALTER TABLE public."article_authors" ADD CONSTRAINT "article_authors_pkey" PRIMARY KEY (id);

ALTER TABLE public."article_authors" ADD CONSTRAINT "article_authors_article_id_user_id_key" UNIQUE (article_id, user_id);

ALTER TABLE public."event_rsvps" ADD CONSTRAINT "event_rsvps_pkey" PRIMARY KEY (id);

ALTER TABLE public."event_rsvps" ADD CONSTRAINT "event_rsvps_event_id_user_id_key" UNIQUE (event_id, user_id);

ALTER TABLE public."actor_followers" ADD CONSTRAINT "actor_followers_pkey" PRIMARY KEY (id);

ALTER TABLE public."actor_followers" ADD CONSTRAINT "actor_followers_local_actor_id_follower_actor_url_key" UNIQUE (local_actor_id, follower_actor_url);

ALTER TABLE public."inbox_items" ADD CONSTRAINT "inbox_items_pkey" PRIMARY KEY (id);

ALTER TABLE public."events" ADD CONSTRAINT "events_visibility_check" CHECK ((visibility = ANY (ARRAY['public'::text, 'connections'::text, 'private'::text])));

ALTER TABLE public."event_invitations" ADD CONSTRAINT "event_invitations_status_check" CHECK ((status = ANY (ARRAY['pending'::text, 'accepted'::text, 'declined'::text])));

ALTER TABLE public."event_invitations" ADD CONSTRAINT "event_invitations_pkey" PRIMARY KEY (id);

ALTER TABLE public."event_invitations" ADD CONSTRAINT "event_invitations_event_id_user_id_key" UNIQUE (event_id, user_id);

ALTER TABLE public."oauth_clients" ADD CONSTRAINT "oauth_clients_pkey" PRIMARY KEY (id);

ALTER TABLE public."oauth_clients" ADD CONSTRAINT "oauth_clients_instance_domain_key" UNIQUE (instance_domain);

ALTER TABLE public."federated_sessions" ADD CONSTRAINT "federated_sessions_pkey" PRIMARY KEY (id);

ALTER TABLE public."federated_sessions" ADD CONSTRAINT "federated_sessions_profile_id_remote_instance_key" UNIQUE (profile_id, remote_instance);

ALTER TABLE public."profiles" ADD CONSTRAINT "profiles_auth_type_check" CHECK ((auth_type = ANY (ARRAY['local'::text, 'federated'::text])));

ALTER TABLE public."notifications" ADD CONSTRAINT "notifications_pkey" PRIMARY KEY (id);

ALTER TABLE public."skill_endorsements" ADD CONSTRAINT "skill_endorsements_pkey" PRIMARY KEY (id);

ALTER TABLE public."skill_endorsements" ADD CONSTRAINT "skill_endorsements_skill_id_endorser_id_key" UNIQUE (skill_id, endorser_id);

ALTER TABLE public."recommendations" ADD CONSTRAINT "different_users" CHECK ((recommender_id <> recipient_id));

ALTER TABLE public."recommendations" ADD CONSTRAINT "recommendations_pkey" PRIMARY KEY (id);

ALTER TABLE public."user_blocks" ADD CONSTRAINT "user_blocks_pkey" PRIMARY KEY (id);

ALTER TABLE public."user_blocks" ADD CONSTRAINT "user_blocks_blocker_id_blocked_user_id_key" UNIQUE (blocker_id, blocked_user_id);

ALTER TABLE public."referrals" ADD CONSTRAINT "referrals_status_check" CHECK ((status = ANY (ARRAY['pending'::text, 'signed_up'::text, 'completed'::text])));

ALTER TABLE public."referrals" ADD CONSTRAINT "referrals_pkey" PRIMARY KEY (id);

ALTER TABLE public."referrals" ADD CONSTRAINT "referrals_referral_code_key" UNIQUE (referral_code);

ALTER TABLE public."saved_items" ADD CONSTRAINT "saved_items_pkey" PRIMARY KEY (id);

ALTER TABLE public."saved_items" ADD CONSTRAINT "saved_items_user_id_item_type_item_id_key" UNIQUE (user_id, item_type, item_id);

ALTER TABLE public."content_reports" ADD CONSTRAINT "content_reports_content_type_check" CHECK ((content_type = ANY (ARRAY['post'::text, 'article'::text, 'job'::text, 'user'::text, 'event'::text])));

ALTER TABLE public."content_reports" ADD CONSTRAINT "content_reports_status_check" CHECK ((status = ANY (ARRAY['pending'::text, 'reviewed'::text, 'resolved'::text, 'dismissed'::text])));

ALTER TABLE public."content_reports" ADD CONSTRAINT "content_reports_pkey" PRIMARY KEY (id);

ALTER TABLE public."federation_alerts" ADD CONSTRAINT "federation_alerts_severity_check" CHECK ((severity = ANY (ARRAY['info'::text, 'warning'::text, 'critical'::text])));

ALTER TABLE public."federation_alerts" ADD CONSTRAINT "federation_alerts_pkey" PRIMARY KEY (id);

ALTER TABLE public."author_follows" ADD CONSTRAINT "author_follows_different_users" CHECK ((follower_id <> author_id));

ALTER TABLE public."author_follows" ADD CONSTRAINT "author_follows_pkey" PRIMARY KEY (id);

ALTER TABLE public."author_follows" ADD CONSTRAINT "author_follows_follower_id_author_id_key" UNIQUE (follower_id, author_id);

ALTER TABLE public."starter_packs" ADD CONSTRAINT "starter_packs_pkey" PRIMARY KEY (id);

ALTER TABLE public."starter_packs" ADD CONSTRAINT "starter_packs_slug_key" UNIQUE (slug);

ALTER TABLE public."poll_votes" ADD CONSTRAINT "poll_votes_poll_id_user_id_option_index_key" UNIQUE (poll_id, user_id, option_index);

ALTER TABLE public."password_reset_codes" ADD CONSTRAINT "password_reset_codes_pkey" PRIMARY KEY (id);

ALTER TABLE public."reactions" ADD CONSTRAINT "reactions_reaction_check" CHECK ((reaction = ANY (ARRAY['love'::text, 'celebrate'::text, 'support'::text, 'empathy'::text, 'insightful'::text])));

ALTER TABLE public."reactions" ADD CONSTRAINT "reactions_pkey" PRIMARY KEY (id);

ALTER TABLE public."reactions" ADD CONSTRAINT "reactions_unique_user_target" UNIQUE (target_type, target_id, user_id);

ALTER TABLE public."starter_pack_members" ADD CONSTRAINT "starter_pack_members_pkey" PRIMARY KEY (id);

ALTER TABLE public."starter_pack_members" ADD CONSTRAINT "starter_pack_members_pack_id_user_id_key" UNIQUE (pack_id, user_id);

ALTER TABLE public."user_followed_packs" ADD CONSTRAINT "user_followed_packs_pkey" PRIMARY KEY (id);

ALTER TABLE public."user_followed_packs" ADD CONSTRAINT "user_followed_packs_user_id_pack_id_key" UNIQUE (user_id, pack_id);

ALTER TABLE public."user_feed_preferences" ADD CONSTRAINT "user_feed_preferences_pkey" PRIMARY KEY (id);

ALTER TABLE public."user_feed_preferences" ADD CONSTRAINT "user_feed_preferences_user_id_key" UNIQUE (user_id);

ALTER TABLE public."custom_feeds" ADD CONSTRAINT "custom_feeds_pkey" PRIMARY KEY (id);

ALTER TABLE public."message_requests" ADD CONSTRAINT "message_requests_pkey" PRIMARY KEY (id);

ALTER TABLE public."message_requests" ADD CONSTRAINT "message_requests_sender_id_recipient_id_key" UNIQUE (sender_id, recipient_id);

ALTER TABLE public."poll_votes" ADD CONSTRAINT "poll_votes_pkey" PRIMARY KEY (id);

ALTER TABLE public."saved_items" ADD CONSTRAINT "saved_items_item_type_check" CHECK ((item_type = ANY (ARRAY['job'::text, 'article'::text, 'post'::text, 'event'::text, 'comment'::text])));

ALTER TABLE public."user_consents" ADD CONSTRAINT "user_consents_pkey" PRIMARY KEY (id);

ALTER TABLE public."user_consents" ADD CONSTRAINT "user_consents_user_id_consent_type_version_key" UNIQUE (user_id, consent_type, version);

ALTER TABLE public."user_bans" ADD CONSTRAINT "user_bans_pkey" PRIMARY KEY (id);

ALTER TABLE public."user_bans" ADD CONSTRAINT "user_bans_user_id_created_at_key" UNIQUE (user_id, created_at);

ALTER TABLE public."reactions" ADD CONSTRAINT "reactions_target_type_check" CHECK ((target_type = ANY (ARRAY['post'::text, 'reply'::text, 'message'::text])));

ALTER TABLE public."job_conversations" ADD CONSTRAINT "job_conversations_pkey" PRIMARY KEY (id);

ALTER TABLE public."job_conversations" ADD CONSTRAINT "job_conversations_job_post_id_applicant_id_key" UNIQUE (job_post_id, applicant_id);

ALTER TABLE public."notification_digest_tracking" ADD CONSTRAINT "notification_digest_tracking_pkey" PRIMARY KEY (user_id);

ALTER TABLE public."companies" ADD CONSTRAINT "companies_pkey" PRIMARY KEY (id);

ALTER TABLE public."companies" ADD CONSTRAINT "companies_slug_key" UNIQUE (slug);

ALTER TABLE public."company_roles" ADD CONSTRAINT "company_roles_pkey" PRIMARY KEY (id);

ALTER TABLE public."company_roles" ADD CONSTRAINT "company_roles_company_id_user_id_key" UNIQUE (company_id, user_id);

ALTER TABLE public."company_followers" ADD CONSTRAINT "company_followers_pkey" PRIMARY KEY (id);

ALTER TABLE public."company_followers" ADD CONSTRAINT "company_followers_company_id_user_id_key" UNIQUE (company_id, user_id);

ALTER TABLE public."company_employees" ADD CONSTRAINT "company_employees_pkey" PRIMARY KEY (id);

ALTER TABLE public."company_employees" ADD CONSTRAINT "company_employees_company_id_user_id_start_date_key" UNIQUE (company_id, user_id, start_date);

ALTER TABLE public."company_audit_log" ADD CONSTRAINT "company_audit_log_pkey" PRIMARY KEY (id);

ALTER TABLE public."reserved_company_slugs" ADD CONSTRAINT "reserved_company_slugs_pkey" PRIMARY KEY (slug);

ALTER TABLE public."company_claim_requests" ADD CONSTRAINT "company_claim_requests_pkey" PRIMARY KEY (id);

ALTER TABLE public."site_alerts" ADD CONSTRAINT "site_alerts_type_check" CHECK ((type = ANY (ARRAY['error'::text, 'success'::text])));

ALTER TABLE public."site_alerts" ADD CONSTRAINT "site_alerts_pkey" PRIMARY KEY (id);

ALTER TABLE public."webfinger_cache" ADD CONSTRAINT "webfinger_cache_pkey" PRIMARY KEY (id);

ALTER TABLE public."webfinger_cache" ADD CONSTRAINT "webfinger_cache_acct_key" UNIQUE (acct);

ALTER TABLE public."profile_section_visibility" ADD CONSTRAINT "profile_section_visibility_pkey" PRIMARY KEY (id);

ALTER TABLE public."profile_section_visibility" ADD CONSTRAINT "profile_section_visibility_user_id_section_key" UNIQUE (user_id, section);

ALTER TABLE public."mfa_recovery_requests" ADD CONSTRAINT "mfa_recovery_requests_status_check" CHECK ((status = ANY (ARRAY['pending'::text, 'in_progress'::text, 'resolved'::text, 'rejected'::text])));

ALTER TABLE public."mfa_recovery_requests" ADD CONSTRAINT "mfa_recovery_requests_pkey" PRIMARY KEY (id);

ALTER TABLE public."mfa_recovery_tokens" ADD CONSTRAINT "mfa_recovery_tokens_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public."mfa_recovery_tokens" ADD CONSTRAINT "mfa_recovery_tokens_created_by_admin_id_fkey" FOREIGN KEY (created_by_admin_id) REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE public."mfa_recovery_tokens" ADD CONSTRAINT "mfa_recovery_tokens_request_id_fkey" FOREIGN KEY (request_id) REFERENCES mfa_recovery_requests(id) ON DELETE SET NULL;

ALTER TABLE public."actors" ADD CONSTRAINT "actors_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public."actors" ADD CONSTRAINT "fk_actors_profiles" FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;

ALTER TABLE public."user_roles" ADD CONSTRAINT "user_roles_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public."profiles" ADD CONSTRAINT "profiles_id_fkey" FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public."email_verification_tokens" ADD CONSTRAINT "email_verification_tokens_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public."articles" ADD CONSTRAINT "articles_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public."ap_objects" ADD CONSTRAINT "ap_objects_attributed_to_fkey" FOREIGN KEY (attributed_to) REFERENCES actors(id) ON DELETE CASCADE;

ALTER TABLE public."user_settings" ADD CONSTRAINT "user_settings_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public."user_connections" ADD CONSTRAINT "fk_user_connections_user_id" FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;

ALTER TABLE public."user_connections" ADD CONSTRAINT "fk_user_connections_connected_user_id" FOREIGN KEY (connected_user_id) REFERENCES profiles(id) ON DELETE CASCADE;

ALTER TABLE public."moderation_actions" ADD CONSTRAINT "moderation_actions_target_user_id_fkey" FOREIGN KEY (target_user_id) REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE public."moderation_actions" ADD CONSTRAINT "moderation_actions_moderator_id_fkey" FOREIGN KEY (moderator_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public."profile_views" ADD CONSTRAINT "profile_views_profile_id_fkey" FOREIGN KEY (profile_id) REFERENCES profiles(id) ON DELETE CASCADE;

ALTER TABLE public."profile_views" ADD CONSTRAINT "profile_views_viewer_id_fkey" FOREIGN KEY (viewer_id) REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE public."outgoing_follows" ADD CONSTRAINT "outgoing_follows_local_actor_id_fkey" FOREIGN KEY (local_actor_id) REFERENCES actors(id) ON DELETE CASCADE;

ALTER TABLE public."federation_queue_partitioned" ADD CONSTRAINT "federation_queue_partitioned_actor_id_fkey" FOREIGN KEY (actor_id) REFERENCES actors(id) ON DELETE CASCADE;

ALTER TABLE public."follower_batches" ADD CONSTRAINT "follower_batches_actor_id_fkey" FOREIGN KEY (actor_id) REFERENCES actors(id) ON DELETE CASCADE;

ALTER TABLE public."experiences" ADD CONSTRAINT "experiences_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public."education" ADD CONSTRAINT "education_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public."skills" ADD CONSTRAINT "skills_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public."activities" ADD CONSTRAINT "activities_actor_id_fkey" FOREIGN KEY (actor_id) REFERENCES actors(id) ON DELETE CASCADE;

ALTER TABLE public."article_reactions" ADD CONSTRAINT "article_reactions_article_id_fkey" FOREIGN KEY (article_id) REFERENCES articles(id) ON DELETE CASCADE;

ALTER TABLE public."article_reactions" ADD CONSTRAINT "article_reactions_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public."events" ADD CONSTRAINT "events_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public."job_posts" ADD CONSTRAINT "job_posts_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public."messages" ADD CONSTRAINT "messages_sender_id_fkey" FOREIGN KEY (sender_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public."messages" ADD CONSTRAINT "messages_recipient_id_fkey" FOREIGN KEY (recipient_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public."post_replies" ADD CONSTRAINT "post_replies_post_id_fkey" FOREIGN KEY (post_id) REFERENCES ap_objects(id) ON DELETE CASCADE;

ALTER TABLE public."post_replies" ADD CONSTRAINT "post_replies_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public."cv_sections" ADD CONSTRAINT "cv_sections_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public."article_authors" ADD CONSTRAINT "article_authors_article_id_fkey" FOREIGN KEY (article_id) REFERENCES articles(id) ON DELETE CASCADE;

ALTER TABLE public."article_authors" ADD CONSTRAINT "article_authors_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public."event_rsvps" ADD CONSTRAINT "event_rsvps_event_id_fkey" FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE;

ALTER TABLE public."event_rsvps" ADD CONSTRAINT "event_rsvps_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public."actor_followers" ADD CONSTRAINT "actor_followers_local_actor_id_fkey" FOREIGN KEY (local_actor_id) REFERENCES actors(id) ON DELETE CASCADE;

ALTER TABLE public."inbox_items" ADD CONSTRAINT "inbox_items_recipient_id_fkey" FOREIGN KEY (recipient_id) REFERENCES actors(id) ON DELETE CASCADE;

ALTER TABLE public."event_invitations" ADD CONSTRAINT "event_invitations_event_id_fkey" FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE;

ALTER TABLE public."event_invitations" ADD CONSTRAINT "event_invitations_user_id_fkey" FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;

ALTER TABLE public."federated_sessions" ADD CONSTRAINT "federated_sessions_profile_id_fkey" FOREIGN KEY (profile_id) REFERENCES profiles(id) ON DELETE CASCADE;

ALTER TABLE public."notifications" ADD CONSTRAINT "notifications_recipient_id_fkey" FOREIGN KEY (recipient_id) REFERENCES profiles(id) ON DELETE CASCADE;

ALTER TABLE public."notifications" ADD CONSTRAINT "notifications_actor_id_fkey" FOREIGN KEY (actor_id) REFERENCES profiles(id) ON DELETE SET NULL;

ALTER TABLE public."skill_endorsements" ADD CONSTRAINT "skill_endorsements_skill_id_fkey" FOREIGN KEY (skill_id) REFERENCES skills(id) ON DELETE CASCADE;

ALTER TABLE public."skill_endorsements" ADD CONSTRAINT "skill_endorsements_endorser_id_fkey" FOREIGN KEY (endorser_id) REFERENCES profiles(id) ON DELETE CASCADE;

ALTER TABLE public."recommendations" ADD CONSTRAINT "recommendations_recommender_id_fkey" FOREIGN KEY (recommender_id) REFERENCES profiles(id) ON DELETE CASCADE;

ALTER TABLE public."recommendations" ADD CONSTRAINT "recommendations_recipient_id_fkey" FOREIGN KEY (recipient_id) REFERENCES profiles(id) ON DELETE CASCADE;

ALTER TABLE public."user_blocks" ADD CONSTRAINT "user_blocks_blocker_id_fkey" FOREIGN KEY (blocker_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public."user_blocks" ADD CONSTRAINT "user_blocks_blocked_user_id_fkey" FOREIGN KEY (blocked_user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public."referrals" ADD CONSTRAINT "referrals_referrer_id_fkey" FOREIGN KEY (referrer_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public."referrals" ADD CONSTRAINT "referrals_referred_user_id_fkey" FOREIGN KEY (referred_user_id) REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE public."saved_items" ADD CONSTRAINT "saved_items_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public."content_reports" ADD CONSTRAINT "content_reports_reporter_id_fkey" FOREIGN KEY (reporter_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public."poll_votes" ADD CONSTRAINT "poll_votes_poll_id_fkey" FOREIGN KEY (poll_id) REFERENCES ap_objects(id) ON DELETE CASCADE;

ALTER TABLE public."starter_packs" ADD CONSTRAINT "starter_packs_creator_id_fkey" FOREIGN KEY (creator_id) REFERENCES profiles(id) ON DELETE SET NULL;

ALTER TABLE public."starter_pack_members" ADD CONSTRAINT "starter_pack_members_pack_id_fkey" FOREIGN KEY (pack_id) REFERENCES starter_packs(id) ON DELETE CASCADE;

ALTER TABLE public."starter_pack_members" ADD CONSTRAINT "starter_pack_members_added_by_fkey" FOREIGN KEY (added_by) REFERENCES profiles(id) ON DELETE SET NULL;

ALTER TABLE public."user_followed_packs" ADD CONSTRAINT "user_followed_packs_pack_id_fkey" FOREIGN KEY (pack_id) REFERENCES starter_packs(id) ON DELETE CASCADE;

ALTER TABLE public."custom_feeds" ADD CONSTRAINT "custom_feeds_user_id_fkey" FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;

ALTER TABLE public."message_requests" ADD CONSTRAINT "message_requests_sender_id_fkey" FOREIGN KEY (sender_id) REFERENCES profiles(id) ON DELETE CASCADE;

ALTER TABLE public."message_requests" ADD CONSTRAINT "message_requests_recipient_id_fkey" FOREIGN KEY (recipient_id) REFERENCES profiles(id) ON DELETE CASCADE;

ALTER TABLE public."user_consents" ADD CONSTRAINT "user_consents_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public."job_conversations" ADD CONSTRAINT "job_conversations_job_post_id_fkey" FOREIGN KEY (job_post_id) REFERENCES job_posts(id) ON DELETE CASCADE;

ALTER TABLE public."job_conversations" ADD CONSTRAINT "job_conversations_applicant_id_fkey" FOREIGN KEY (applicant_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public."job_conversations" ADD CONSTRAINT "job_conversations_poster_id_fkey" FOREIGN KEY (poster_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public."messages" ADD CONSTRAINT "messages_job_conversation_id_fkey" FOREIGN KEY (job_conversation_id) REFERENCES job_conversations(id) ON DELETE CASCADE;

ALTER TABLE public."notification_digest_tracking" ADD CONSTRAINT "notification_digest_tracking_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public."company_roles" ADD CONSTRAINT "company_roles_company_id_fkey" FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE;

ALTER TABLE public."company_followers" ADD CONSTRAINT "company_followers_company_id_fkey" FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE;

ALTER TABLE public."company_employees" ADD CONSTRAINT "company_employees_company_id_fkey" FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE;

ALTER TABLE public."company_audit_log" ADD CONSTRAINT "company_audit_log_company_id_fkey" FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE;

ALTER TABLE public."company_claim_requests" ADD CONSTRAINT "company_claim_requests_company_id_fkey" FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE;

ALTER TABLE public."job_posts" ADD CONSTRAINT "job_posts_company_id_fkey" FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE SET NULL;

ALTER TABLE public."ap_objects" ADD CONSTRAINT "ap_objects_company_id_fkey" FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE;

ALTER TABLE public."articles" ADD CONSTRAINT "articles_company_id_fkey" FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE;

ALTER TABLE public."starter_pack_members" ADD CONSTRAINT "starter_pack_members_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public."user_bans" ADD CONSTRAINT "user_bans_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public."user_connections" ADD CONSTRAINT "user_connections_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public."user_feed_preferences" ADD CONSTRAINT "user_feed_preferences_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public."user_followed_packs" ADD CONSTRAINT "user_followed_packs_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public."blocked_actors" ADD CONSTRAINT "blocked_actors_created_by_fkey" FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE public."blocked_actors" ADD CONSTRAINT "blocked_actors_updated_by_fkey" FOREIGN KEY (updated_by) REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE public."blocked_domains" ADD CONSTRAINT "blocked_domains_created_by_fkey" FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE public."blocked_domains" ADD CONSTRAINT "blocked_domains_updated_by_fkey" FOREIGN KEY (updated_by) REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE public."content_reports" ADD CONSTRAINT "content_reports_reviewed_by_fkey" FOREIGN KEY (reviewed_by) REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE public."mfa_recovery_requests" ADD CONSTRAINT "mfa_recovery_requests_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE public."mfa_recovery_requests" ADD CONSTRAINT "mfa_recovery_requests_handled_by_fkey" FOREIGN KEY (handled_by) REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE OR REPLACE FUNCTION public.get_event_owner(p_event_id uuid)
 RETURNS uuid
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT user_id FROM public.events WHERE id = p_event_id;
$function$
;

CREATE OR REPLACE FUNCTION public.safe_uuid(_text text)
 RETURNS uuid
 LANGUAGE plpgsql
 IMMUTABLE
AS $function$
BEGIN
  RETURN _text::uuid;
EXCEPTION WHEN others THEN
  RETURN NULL;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.is_user_invited_to_event(p_event_id uuid, p_user_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.event_invitations
    WHERE event_id = p_event_id AND user_id = p_user_id
  );
$function$
;

CREATE OR REPLACE FUNCTION public.calculate_job_transparency_score()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
  score INTEGER := 0;
BEGIN
  IF NEW.salary_min IS NOT NULL AND NEW.salary_max IS NOT NULL THEN score := score + 25; END IF;
  IF NEW.remote_policy IS NOT NULL THEN score := score + 15; END IF;
  IF NEW.interview_process IS NOT NULL AND length(NEW.interview_process) > 10 THEN score := score + 20; END IF;
  IF NEW.response_time IS NOT NULL THEN score := score + 15; END IF;
  IF NEW.team_size IS NOT NULL THEN score := score + 10; END IF;
  IF NEW.growth_path IS NOT NULL THEN score := score + 10; END IF;
  IF NEW.visa_sponsorship IS NOT NULL THEN score := score + 5; END IF;
  NEW.transparency_score := score;
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.cleanup_expired_reset_codes()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  DELETE FROM public.password_reset_codes
  WHERE expires_at < now() OR used = true;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_actor_private_key(actor_uuid uuid)
 RETURNS text
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
  SELECT private_key FROM actors
  WHERE id = actor_uuid
  AND user_id = auth.uid();
$function$
;

CREATE OR REPLACE FUNCTION public.create_follower_batches(p_actor_id uuid, p_followers jsonb, p_batch_size integer DEFAULT 50)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  batch_count INTEGER := 0;
  follower_array JSONB[];
  i INTEGER := 0;
  batch JSONB;
BEGIN
  -- Convert JSONB array to PostgreSQL array
  SELECT array_agg(value) INTO follower_array FROM jsonb_array_elements(p_followers);

  -- Create batches
  WHILE i < array_length(follower_array, 1) LOOP
    batch := to_jsonb(follower_array[i+1:least(i+p_batch_size, array_length(follower_array, 1))]);

    INSERT INTO public.follower_batches (actor_id, followers, status)
    VALUES (p_actor_id, batch, 'pending');

    batch_count := batch_count + 1;
    i := i + p_batch_size;
  END LOOP;

  RETURN batch_count;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.update_actor_follower_count()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
BEGIN
  -- This would be called by triggers on follower tables
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_actor_private_key_service(actor_uuid uuid)
 RETURNS text
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
  SELECT private_key FROM actors
  WHERE id = actor_uuid;
$function$
;

CREATE OR REPLACE FUNCTION public.get_user_id_by_email(_email text)
 RETURNS uuid
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public', 'auth'
AS $function$
  SELECT id FROM auth.users WHERE lower(email) = lower(_email) LIMIT 1;
$function$
;

CREATE OR REPLACE FUNCTION public.notify_followers_of_article()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Only trigger when article becomes published
  IF NEW.published = true AND (OLD IS NULL OR OLD.published = false) THEN
    INSERT INTO notifications (type, recipient_id, actor_id, object_id, object_type, content)
    SELECT
      'article_published',
      af.follower_id,
      NEW.user_id,
      NEW.id::text,
      'article',
      'published a new article: ' || LEFT(NEW.title, 100)
    FROM author_follows af
    WHERE af.author_id = NEW.user_id;
  END IF;
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.can_view_own_profile_phone(profile_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT auth.uid() = profile_id;
$function$
;

CREATE OR REPLACE FUNCTION public.create_mutual_connection_follows(user_a uuid, user_b uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Verify caller is one of the users
  IF auth.uid() NOT IN (user_a, user_b) THEN
    RAISE EXCEPTION 'Unauthorized: caller must be one of the users';
  END IF;

  -- Verify an accepted connection exists between the users
  IF NOT EXISTS (
    SELECT 1 FROM user_connections
    WHERE status = 'accepted'
    AND (
      (user_id = user_a AND connected_user_id = user_b) OR
      (user_id = user_b AND connected_user_id = user_a)
    )
  ) THEN
    RAISE EXCEPTION 'No accepted connection found between users';
  END IF;

  -- Create mutual follows with source='connection'
  INSERT INTO author_follows (follower_id, author_id, source)
  VALUES
    (user_a, user_b, 'connection'),
    (user_b, user_a, 'connection')
  ON CONFLICT (follower_id, author_id) DO NOTHING;

  RETURN TRUE;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.has_company_role(_user_id uuid, _company_id uuid, _roles company_role[])
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.company_roles
    WHERE user_id = _user_id
      AND company_id = _company_id
      AND role = ANY(_roles)
  );
$function$
;

CREATE OR REPLACE FUNCTION public.set_federation_queue_partition_key()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
BEGIN
  NEW.partition_key = public.actor_id_to_partition_key(NEW.actor_id);
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.cleanup_federation_signature_cache()
 RETURNS void
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  DELETE FROM public.federation_signature_cache
  WHERE created_at < now() - interval '15 minutes';
$function$
;

CREATE OR REPLACE FUNCTION public.is_slug_reserved(_slug text)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.reserved_company_slugs WHERE slug = lower(_slug)
  );
$function$
;

CREATE OR REPLACE FUNCTION public.update_starter_pack_member_count()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.starter_packs SET member_count = member_count + 1, updated_at = now() WHERE id = NEW.pack_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.starter_packs SET member_count = GREATEST(0, member_count - 1), updated_at = now() WHERE id = OLD.pack_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.update_starter_pack_follower_count()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.starter_packs SET follower_count = follower_count + 1, updated_at = now() WHERE id = NEW.pack_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.starter_packs SET follower_count = GREATEST(0, follower_count - 1), updated_at = now() WHERE id = OLD.pack_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.generate_referral_code()
 RETURNS text
 LANGUAGE plpgsql
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  chars TEXT := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  result TEXT := '';
  i INT;
BEGIN
  FOR i IN 1..6 LOOP
    result := result || substr(chars, floor(random() * length(chars) + 1)::int, 1);
  END LOOP;
  RETURN result;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_batch_boost_counts(post_ids uuid[])
 RETURNS TABLE(post_id uuid, boost_count bigint)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
  SELECT
    (content->'object'->>'id')::uuid as post_id,
    COUNT(*) as boost_count
  FROM ap_objects
  WHERE type = 'Announce'
    AND (content->'object'->>'id')::uuid = ANY(post_ids)
  GROUP BY (content->'object'->>'id')::uuid
$function$
;

CREATE OR REPLACE FUNCTION public.update_cache_on_access()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  NEW.expires_at = now() + interval '7 days';
  NEW.hit_count = COALESCE(OLD.hit_count, 0) + 1;
  NEW.last_accessed_at = now();
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_current_public_key()
 RETURNS text
 LANGUAGE sql
 STABLE
 SET search_path TO 'public', 'pg_temp'
AS $function$
  SELECT public_key FROM public.server_keys
  WHERE is_current = true AND revoked_at IS NULL
  ORDER BY created_at DESC
  LIMIT 1;
$function$
;

CREATE OR REPLACE FUNCTION public.queue_post_for_federation()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Only for Note types that haven't been queued yet
  IF NEW.type = 'Note' AND NEW.attributed_to IS NOT NULL THEN
    -- Check if already queued (avoid duplicates from outbox)
    IF NOT EXISTS (
      SELECT 1 FROM federation_queue_partitioned
      WHERE activity->>'object_id' = NEW.id::text
        AND created_at > now() - interval '1 minute'
    ) THEN
      INSERT INTO federation_queue_partitioned (
        actor_id,
        activity,
        status,
        partition_key,
        priority
      ) VALUES (
        NEW.attributed_to,
        jsonb_build_object(
          'type', 'Create',
          'object_id', NEW.id::text,
          'needs_enrichment', true
        ),
        'pending',
        actor_id_to_partition_key(NEW.attributed_to),
        5
      );
    END IF;
  END IF;
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.is_user_banned(check_user_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.user_bans
    WHERE user_id = check_user_id
    AND revoked_at IS NULL
    AND (expires_at IS NULL OR expires_at > now())
  );
$function$
;

CREATE OR REPLACE FUNCTION public.create_federation_alert(p_type text, p_severity text, p_message text, p_metadata jsonb DEFAULT '{}'::jsonb)
 RETURNS uuid
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  INSERT INTO public.federation_alerts (alert_type, severity, message, metadata)
  VALUES (p_type, p_severity, p_message, p_metadata)
  RETURNING id;
$function$
;

CREATE OR REPLACE FUNCTION public.get_smart_suggestions(p_user_id uuid, p_limit integer DEFAULT 10)
 RETURNS TABLE(user_id uuid, username text, fullname text, headline text, avatar_url text, is_verified boolean, mutual_count bigint, suggestion_reason text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY
  WITH
  -- Get the current user's direct connections
  my_connections AS (
    SELECT
      CASE WHEN uc.user_id = p_user_id THEN uc.connected_user_id ELSE uc.user_id END as connected_id
    FROM user_connections uc
    WHERE (uc.user_id = p_user_id OR uc.connected_user_id = p_user_id)
    AND uc.status IN ('accepted', 'pending')
  ),
  -- Get current user's location
  my_location AS (
    SELECT location FROM profiles WHERE id = p_user_id
  ),
  -- Find 2nd degree connections (friends of friends)
  second_degree AS (
    SELECT
      CASE WHEN uc.user_id = mc.connected_id THEN uc.connected_user_id ELSE uc.user_id END as potential_id,
      COUNT(*) as mutual
    FROM user_connections uc
    JOIN my_connections mc ON (uc.user_id = mc.connected_id OR uc.connected_user_id = mc.connected_id)
    WHERE uc.status = 'accepted'
    AND CASE WHEN uc.user_id = mc.connected_id THEN uc.connected_user_id ELSE uc.user_id END != p_user_id
    AND CASE WHEN uc.user_id = mc.connected_id THEN uc.connected_user_id ELSE uc.user_id END NOT IN (SELECT connected_id FROM my_connections)
    GROUP BY potential_id
  ),
  -- Combine suggestions with priority scoring
  suggestions AS (
    SELECT
      p.id,
      p.username,
      p.fullname,
      p.headline,
      p.avatar_url,
      p.is_verified,
      COALESCE(sd.mutual, 0) as mutual_count,
      CASE
        WHEN sd.mutual IS NOT NULL AND sd.mutual > 0 THEN
          sd.mutual::text || ' mutual connection' || CASE WHEN sd.mutual > 1 THEN 's' ELSE '' END
        WHEN p.location IS NOT NULL AND ml.location IS NOT NULL AND p.location ILIKE '%' || split_part(ml.location, ',', 1) || '%' THEN
          'Also in ' || split_part(p.location, ',', 1)
        ELSE
          'Suggested for you'
      END as reason,
      -- Priority score: mutual connections weight most, then location match
      CASE
        WHEN sd.mutual IS NOT NULL THEN 100 + sd.mutual
        WHEN p.location IS NOT NULL AND ml.location IS NOT NULL AND p.location ILIKE '%' || split_part(ml.location, ',', 1) || '%' THEN 50
        ELSE 1
      END as priority
    FROM profiles p
    LEFT JOIN second_degree sd ON p.id = sd.potential_id
    CROSS JOIN my_location ml
    WHERE p.id != p_user_id
    AND p.id NOT IN (SELECT connected_id FROM my_connections)
    AND p.username IS NOT NULL
  )
  SELECT
    s.id,
    s.username,
    s.fullname,
    s.headline,
    s.avatar_url,
    s.is_verified,
    s.mutual_count,
    s.reason
  FROM suggestions s
  ORDER BY s.priority DESC, s.mutual_count DESC, s.is_verified DESC NULLS LAST
  LIMIT p_limit;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.ensure_actor_keys(actor_uuid uuid, new_private_key text, new_public_key text)
 RETURNS TABLE(private_key text, public_key text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  lock_key bigint;
  existing_priv text;
  existing_pub text;
BEGIN
  -- Derive a stable bigint lock key from the uuid
  lock_key := ('x' || substr(md5(actor_uuid::text), 1, 16))::bit(64)::bigint;
  PERFORM pg_advisory_xact_lock(lock_key);

  SELECT a.private_key, a.public_key INTO existing_priv, existing_pub
  FROM public.actors a WHERE a.id = actor_uuid FOR UPDATE;

  IF existing_priv IS NOT NULL AND existing_pub IS NOT NULL THEN
    RETURN QUERY SELECT existing_priv, existing_pub;
    RETURN;
  END IF;

  UPDATE public.actors
  SET private_key = new_private_key,
      public_key = new_public_key,
      updated_at = now()
  WHERE id = actor_uuid
  RETURNING actors.private_key, actors.public_key INTO existing_priv, existing_pub;

  RETURN QUERY SELECT existing_priv, existing_pub;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_batch_reply_counts(post_ids uuid[])
 RETURNS TABLE(post_id uuid, reply_count bigint)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
  SELECT
    COALESCE(
      (content->>'rootPost')::uuid,
      (content->>'inReplyTo')::uuid
    ) as post_id,
    COUNT(*) as reply_count
  FROM ap_objects
  WHERE type = 'Note'
    AND content->>'inReplyTo' IS NOT NULL
    AND (
      (content->>'rootPost')::uuid = ANY(post_ids)
      OR (content->>'inReplyTo')::uuid = ANY(post_ids)
    )
  GROUP BY COALESCE(
    (content->>'rootPost')::uuid,
    (content->>'inReplyTo')::uuid
  )
$function$
;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$function$
;

CREATE OR REPLACE FUNCTION public.update_instance_health(p_host text, p_success boolean)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.remote_instances (host, health_score, request_count_24h, error_count_24h, last_seen_at)
  VALUES (p_host, CASE WHEN p_success THEN 100 ELSE 90 END, 1, CASE WHEN p_success THEN 0 ELSE 1 END, now())
  ON CONFLICT (host) DO UPDATE SET
    health_score = CASE
      WHEN p_success THEN LEAST(remote_instances.health_score + 1, 100)
      ELSE GREATEST(remote_instances.health_score - 5, 0)
    END,
    request_count_24h = remote_instances.request_count_24h + 1,
    error_count_24h = CASE
      WHEN p_success THEN remote_instances.error_count_24h
      ELSE remote_instances.error_count_24h + 1
    END,
    last_error_at = CASE WHEN p_success THEN remote_instances.last_error_at ELSE now() END,
    last_seen_at = now(),
    updated_at = now();
END;
$function$
;

CREATE OR REPLACE FUNCTION public.update_company_employee_count()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  IF TG_OP = 'INSERT' AND NEW.end_date IS NULL THEN
    UPDATE public.companies SET employee_count = employee_count + 1, updated_at = now() WHERE id = NEW.company_id;
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.end_date IS NULL AND NEW.end_date IS NOT NULL THEN
      UPDATE public.companies SET employee_count = GREATEST(employee_count - 1, 0), updated_at = now() WHERE id = NEW.company_id;
    ELSIF OLD.end_date IS NOT NULL AND NEW.end_date IS NULL THEN
      UPDATE public.companies SET employee_count = employee_count + 1, updated_at = now() WHERE id = NEW.company_id;
    END IF;
  ELSIF TG_OP = 'DELETE' AND OLD.end_date IS NULL THEN
    UPDATE public.companies SET employee_count = GREATEST(employee_count - 1, 0), updated_at = now() WHERE id = OLD.company_id;
  END IF;
  RETURN NULL;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.notify_post_reaction()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  target_post_id text;
  post_author_actor_id uuid;
  post_author_user_id uuid;
  reacting_user_id uuid;
  is_reply_reaction boolean;
BEGIN
  -- Only process Like activities
  IF NEW.type != 'Like' THEN
    RETURN NEW;
  END IF;

  -- Check if this is a reply reaction (skip if so)
  is_reply_reaction := (NEW.content->>'object'->>'type') = 'reply';
  IF is_reply_reaction THEN
    RETURN NEW;
  END IF;

  -- Extract the target post ID from the Like activity
  target_post_id := NEW.content->'object'->>'id';
  IF target_post_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Find the post and its author
  SELECT ap.attributed_to INTO post_author_actor_id
  FROM ap_objects ap
  WHERE ap.id = target_post_id::uuid OR ap.id::text = target_post_id;

  IF post_author_actor_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Get the user_id of the post author
  SELECT a.user_id INTO post_author_user_id
  FROM actors a
  WHERE a.id = post_author_actor_id;

  IF post_author_user_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Get the user_id of the person reacting
  SELECT a.user_id INTO reacting_user_id
  FROM actors a
  WHERE a.id = NEW.attributed_to;

  -- Don't notify if user is liking their own post
  IF reacting_user_id = post_author_user_id THEN
    RETURN NEW;
  END IF;

  -- Create notification for the post author
  INSERT INTO notifications (
    type,
    recipient_id,
    actor_id,
    object_id,
    object_type,
    content,
    read
  ) VALUES (
    'like',
    post_author_user_id,
    reacting_user_id,
    target_post_id,
    'post',
    'liked your post',
    false
  );

  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_onboarding_recommendations(p_user_id uuid, p_headline text DEFAULT ''::text, p_role text DEFAULT ''::text, p_interests text[] DEFAULT '{}'::text[], p_limit integer DEFAULT 12)
 RETURNS TABLE(user_id uuid, username text, fullname text, headline text, avatar_url text, match_score integer, match_reason text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY
  SELECT DISTINCT ON (p.id)
    p.id as user_id,
    p.username,
    p.fullname,
    p.headline,
    p.avatar_url,
    (
      CASE WHEN p.headline ILIKE '%' || p_role || '%' THEN 10 ELSE 0 END +
      CASE WHEN array_length(p_interests, 1) > 0 AND p.headline ILIKE ANY(
        ARRAY(SELECT '%' || unnest || '%' FROM unnest(p_interests))
      ) THEN 5 ELSE 0 END
    )::INT as match_score,
    CASE
      WHEN p.headline ILIKE '%' || p_role || '%' THEN 'Works in similar role'
      ELSE 'Recommended for you'
    END as match_reason
  FROM profiles p
  WHERE p.id != p_user_id
    AND p.fullname IS NOT NULL
    AND (
      p.headline ILIKE '%' || p_role || '%'
      OR (array_length(p_interests, 1) > 0 AND p.headline ILIKE ANY(
        ARRAY(SELECT '%' || unnest || '%' FROM unnest(p_interests))
      ))
      OR (p_headline IS NOT NULL AND p_headline != '' AND p.headline ILIKE '%' || p_headline || '%')
    )
  ORDER BY p.id,
    CASE WHEN p.headline ILIKE '%' || p_role || '%' THEN 10 ELSE 0 END DESC
  LIMIT p_limit;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.check_host_rate_limit(p_remote_host text, p_max_requests_per_minute integer DEFAULT 100)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  request_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO request_count
  FROM public.federation_request_logs
  WHERE remote_host = p_remote_host
    AND timestamp > now() - interval '1 minute';

  RETURN request_count < p_max_requests_per_minute;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_follower_batch_stats()
 RETURNS TABLE(total_batches bigint, pending_batches bigint, processed_batches bigint)
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
  SELECT
    COUNT(*) as total_batches,
    COUNT(*) FILTER (WHERE status = 'pending') as pending_batches,
    COUNT(*) FILTER (WHERE status = 'processed') as processed_batches
  FROM public.follower_batches;
$function$
;

CREATE OR REPLACE FUNCTION public.notify_post_reply()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  post_author_actor_id uuid;
  post_author_user_id uuid;
BEGIN
  -- Find the post author
  SELECT ap.attributed_to INTO post_author_actor_id
  FROM ap_objects ap
  WHERE ap.id = NEW.post_id::uuid;

  IF post_author_actor_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Get the user_id of the post author
  SELECT a.user_id INTO post_author_user_id
  FROM actors a
  WHERE a.id = post_author_actor_id;

  IF post_author_user_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Don't notify if user is replying to their own post
  IF NEW.user_id = post_author_user_id THEN
    RETURN NEW;
  END IF;

  -- Create notification for the post author
  INSERT INTO notifications (
    type,
    recipient_id,
    actor_id,
    object_id,
    object_type,
    content,
    read
  ) VALUES (
    'reply',
    post_author_user_id,
    NEW.user_id,
    NEW.post_id,
    'post',
    'replied to your post',
    false
  );

  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.are_users_connected_secure(user1 uuid, user2 uuid)
 RETURNS boolean
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.user_connections
    WHERE status = 'accepted'
    AND ((user_id = user1 AND connected_user_id = user2)
      OR (user_id = user2 AND connected_user_id = user1))
  );
$function$
;

CREATE OR REPLACE FUNCTION public.ensure_actor_has_keys(actor_uuid uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  has_keys BOOLEAN;
BEGIN
  SELECT (private_key IS NOT NULL AND public_key IS NOT NULL)
  INTO has_keys
  FROM public.actors
  WHERE id = actor_uuid;

  RETURN COALESCE(has_keys, false);
END;
$function$
;

CREATE OR REPLACE FUNCTION public.can_view_phone(profile_owner_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT
    auth.uid() = profile_owner_id
    OR EXISTS (
      SELECT 1 FROM public.user_connections
      WHERE status = 'accepted'
      AND (
        (user_id = auth.uid() AND connected_user_id = profile_owner_id)
        OR (connected_user_id = auth.uid() AND user_id = profile_owner_id)
      )
    )
$function$
;

CREATE OR REPLACE FUNCTION public.are_users_connected(user1 uuid, user2 uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.user_connections
    WHERE status = 'accepted'
    AND ((user_id = user1 AND connected_user_id = user2)
      OR (user_id = user2 AND connected_user_id = user1))
  );
$function$
;

CREATE OR REPLACE FUNCTION public.get_rate_limited_hosts(window_start timestamp with time zone, request_threshold integer)
 RETURNS TABLE(remote_host text, request_count bigint, latest_request timestamp with time zone)
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
    SELECT
        f.remote_host,
        COUNT(*) as request_count,
        MAX(f.timestamp) as latest_request
    FROM federation_request_logs f
    WHERE f.timestamp >= window_start
    GROUP BY f.remote_host
    HAVING COUNT(*) >= request_threshold
    ORDER BY request_count DESC;
$function$
;

CREATE OR REPLACE FUNCTION public.cleanup_expired_actor_cache()
 RETURNS void
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
  DELETE FROM public.remote_actors_cache WHERE expires_at < now();
$function$
;

CREATE OR REPLACE FUNCTION public.get_federation_queue_stats()
 RETURNS TABLE(partition_key integer, total_count integer, pending_count integer, processing_count integer, failed_count integer, processed_count integer)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
BEGIN
    RETURN QUERY
    SELECT
        q.partition_key,
        COUNT(*)::INTEGER AS total_count,
        COUNT(*) FILTER (WHERE q.status = 'pending')::INTEGER AS pending_count,
        COUNT(*) FILTER (WHERE q.status = 'processing')::INTEGER AS processing_count,
        COUNT(*) FILTER (WHERE q.status = 'failed')::INTEGER AS failed_count,
        COUNT(*) FILTER (WHERE q.status = 'processed')::INTEGER AS processed_count
    FROM federation_queue_partitioned q
    GROUP BY q.partition_key
    ORDER BY q.partition_key;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.is_admin(_user_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT public.has_role(_user_id, 'admin')
$function$
;

CREATE OR REPLACE FUNCTION public.update_outgoing_follows_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.update_company_follower_count()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.companies SET follower_count = follower_count + 1, updated_at = now() WHERE id = NEW.company_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.companies SET follower_count = GREATEST(follower_count - 1, 0), updated_at = now() WHERE id = OLD.company_id;
  END IF;
  RETURN NULL;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.prevent_slug_change()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.slug IS DISTINCT FROM OLD.slug THEN
     RAISE EXCEPTION 'Company slug is immutable for SEO stability.';
  END IF;
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.actor_id_to_partition_key(actor_uuid uuid)
 RETURNS integer
 LANGUAGE sql
 IMMUTABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
  SELECT abs(hashtext(actor_uuid::text)) % 16;
$function$
;

CREATE OR REPLACE FUNCTION public.update_endorsement_count()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.skills SET endorsements = COALESCE(endorsements, 0) + 1 WHERE id = NEW.skill_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.skills SET endorsements = GREATEST(COALESCE(endorsements, 0) - 1, 0) WHERE id = OLD.skill_id;
  END IF;
  RETURN NULL;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_participant_info(participant_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  result jsonb;
  profile_data record;
  actor_data record;
  cached_actor_data jsonb;
BEGIN
  -- First try to find in profiles table directly
  SELECT id, username, fullname, avatar_url, auth_type, home_instance
  INTO profile_data
  FROM profiles
  WHERE id = participant_id;

  IF FOUND THEN
    RETURN jsonb_build_object(
      'id', profile_data.id,
      'username', profile_data.username,
      'fullname', profile_data.fullname,
      'avatar_url', profile_data.avatar_url,
      'isFederated', COALESCE(profile_data.auth_type = 'federated', false),
      'homeInstance', profile_data.home_instance,
      'found', true
    );
  END IF;

  -- Try remote actor lookup for federated users
  SELECT a.id, a.preferred_username, a.remote_actor_url, a.is_remote, a.user_id
  INTO actor_data
  FROM actors a
  WHERE (a.user_id = participant_id OR a.id::text = participant_id::text) AND a.is_remote = true;

  IF FOUND THEN
    -- Try to get cached actor data for richer profile info
    SELECT actor_data INTO cached_actor_data
    FROM remote_actors_cache
    WHERE actor_url = actor_data.remote_actor_url;

    RETURN jsonb_build_object(
      'id', participant_id,
      'username', COALESCE(cached_actor_data->>'preferredUsername', actor_data.preferred_username),
      'fullname', cached_actor_data->>'name',
      'avatar_url', cached_actor_data->'icon'->>'url',
      'isFederated', true,
      'homeInstance', CASE
        WHEN actor_data.remote_actor_url IS NOT NULL
        THEN (regexp_match(actor_data.remote_actor_url, 'https?://([^/]+)'))[1]
        ELSE null
      END,
      'found', true
    );
  END IF;

  -- Not found anywhere
  RETURN jsonb_build_object(
    'found', false,
    'isFederated', false
  );
END;
$function$
;

CREATE OR REPLACE FUNCTION public.claim_federation_items(p_partition integer, p_limit integer DEFAULT 50)
 RETURNS SETOF federation_queue_partitioned
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY
  UPDATE federation_queue_partitioned
  SET
    status = 'processing',
    processed_at = now()
  WHERE id IN (
    SELECT id FROM federation_queue_partitioned
    WHERE partition_key = p_partition
      AND status IN ('pending', 'retry')
      AND (next_retry_at IS NULL OR next_retry_at <= now())
      AND (attempts IS NULL OR attempts < max_attempts)
      AND (scheduled_for IS NULL OR scheduled_for <= now())
    ORDER BY priority DESC NULLS LAST, created_at ASC
    LIMIT p_limit
    FOR UPDATE SKIP LOCKED
  )
  RETURNING *;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_federation_health()
 RETURNS TABLE(total_pending bigint, total_processing bigint, total_failed bigint, oldest_pending_age_minutes double precision, avg_processing_time_ms double precision)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*) FILTER (WHERE status = 'pending') as total_pending,
    COUNT(*) FILTER (WHERE status = 'processing') as total_processing,
    COUNT(*) FILTER (WHERE status = 'failed') as total_failed,
    EXTRACT(EPOCH FROM (now() - MIN(created_at) FILTER (WHERE status = 'pending'))) / 60 as oldest_pending_age_minutes,
    0.0::DOUBLE PRECISION as avg_processing_time_ms
  FROM public.federation_queue_partitioned;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.is_user_blocked(checker_id uuid, target_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.user_blocks
    WHERE blocker_id = checker_id AND blocked_user_id = target_id
  );
$function$
;

CREATE OR REPLACE FUNCTION public.get_poll_results(poll_uuid uuid)
 RETURNS TABLE(option_index integer, vote_count bigint)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT
    pv.option_index,
    COUNT(*) as vote_count
  FROM poll_votes pv
  WHERE pv.poll_id = poll_uuid
  GROUP BY pv.option_index
  ORDER BY pv.option_index;
$function$
;

CREATE OR REPLACE FUNCTION public.handle_new_article()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Auto-insert the creator as primary author
  INSERT INTO public.article_authors (article_id, user_id, is_primary, can_edit)
  VALUES (NEW.id, NEW.user_id, true, true)
  ON CONFLICT DO NOTHING;

  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.recalc_company_counts(_company_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _followers int;
  _employees int;
BEGIN
  SELECT count(*) INTO _followers FROM public.company_followers WHERE company_id = _company_id;
  SELECT count(*) INTO _employees FROM public.company_employees WHERE company_id = _company_id AND end_date IS NULL;

  UPDATE public.companies
    SET follower_count = _followers,
        employee_count = _employees,
        updated_at = now()
  WHERE id = _company_id;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_connection_degree(source_user_id uuid, target_user_id uuid)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Direct connection (1st degree)
  IF EXISTS (
    SELECT 1 FROM public.user_connections
    WHERE (
      (user_id = source_user_id AND connected_user_id = target_user_id)
      OR (user_id = target_user_id AND connected_user_id = source_user_id)
    )
    AND status = 'accepted'
  ) THEN
    RETURN 1;
  END IF;

  -- 2nd degree connection
  IF EXISTS (
    SELECT 1 FROM public.user_connections c1
    JOIN public.user_connections c2 ON (
      c1.connected_user_id = c2.user_id
      OR c1.connected_user_id = c2.connected_user_id
      OR c1.user_id = c2.user_id
      OR c1.user_id = c2.connected_user_id
    )
    WHERE c1.status = 'accepted' AND c2.status = 'accepted'
    AND (c1.user_id = source_user_id OR c1.connected_user_id = source_user_id)
    AND (c2.user_id = target_user_id OR c2.connected_user_id = target_user_id)
  ) THEN
    RETURN 2;
  END IF;

  -- Not connected
  RETURN NULL;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.is_moderator(_user_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT public.has_role(_user_id, 'admin') OR public.has_role(_user_id, 'moderator')
$function$
;

CREATE OR REPLACE FUNCTION public.prevent_self_verification()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Only check if verification fields are being modified
  IF (NEW.is_verified IS DISTINCT FROM OLD.is_verified)
    OR (NEW.verified_at IS DISTINCT FROM OLD.verified_at)
    OR (NEW.verified_by IS DISTINCT FROM OLD.verified_by) THEN

    -- Block if the user is verifying themselves AND is not an admin/owner of the company
    IF auth.uid() = NEW.user_id THEN
      -- Allow if user has admin or owner role for this company
      IF NOT EXISTS (
        SELECT 1 FROM public.company_roles
        WHERE company_id = NEW.company_id
          AND user_id = auth.uid()
          AND role IN ('owner', 'admin')
      ) THEN
        RAISE EXCEPTION 'Users cannot modify verification fields';
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Create profile
  INSERT INTO public.profiles (id, username, created_at, updated_at)
  VALUES (NEW.id, 'user_' || substr(NEW.id::text, 1, 8), now(), now())
  ON CONFLICT (id) DO NOTHING;

  -- Create default user role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'user')
  ON CONFLICT (user_id, role) DO NOTHING;

  -- Create default user settings with ON CONFLICT to prevent duplicate key errors
  INSERT INTO public.user_settings (user_id, theme, show_network_connections)
  VALUES (NEW.id, 'system', true)
  ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.update_company_search_vector()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  NEW.search_vector :=
    setweight(to_tsvector('simple', COALESCE(NEW.name, '')), 'A') ||
    setweight(to_tsvector('simple', COALESCE(NEW.tagline, '')), 'B') ||
    setweight(to_tsvector('simple', COALESCE(NEW.description, '')), 'C') ||
    setweight(to_tsvector('simple', COALESCE(NEW.industry, '')), 'B');
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.create_follow(p_local_actor_id uuid, p_remote_actor_url text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_follow_id UUID;
BEGIN
    -- Check if user owns the actor
    IF NOT EXISTS (
        SELECT 1 FROM public.actors
        WHERE id = p_local_actor_id
        AND user_id = auth.uid()
    ) THEN
        RAISE EXCEPTION 'Unauthorized: You do not own this actor';
    END IF;

    -- Insert or update the follow
    INSERT INTO public.outgoing_follows (local_actor_id, remote_actor_url, status)
    VALUES (p_local_actor_id, p_remote_actor_url, 'pending')
    ON CONFLICT (local_actor_id, remote_actor_url)
    DO UPDATE SET status = 'pending', updated_at = now()
    RETURNING id INTO v_follow_id;

    RETURN v_follow_id;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.has_user_voted(poll_uuid uuid, check_user_id uuid)
 RETURNS TABLE(option_index integer)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT pv.option_index
  FROM poll_votes pv
  WHERE pv.poll_id = poll_uuid AND pv.user_id = check_user_id;
$function$
;

CREATE OR REPLACE FUNCTION public.get_post_replies(post_id uuid, max_replies integer DEFAULT 50)
 RETURNS TABLE(id uuid, content jsonb, created_at timestamp with time zone, actor_user_id uuid, actor_username text, company_id uuid)
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY
  SELECT
    ao.id,
    ao.content,
    ao.created_at,
    pa.user_id as actor_user_id,
    pa.preferred_username as actor_username,
    ao.company_id
  FROM ap_objects ao
  LEFT JOIN public_actors pa ON ao.attributed_to = pa.id
  WHERE ao.type = 'Note'
    AND (
      ao.content->>'inReplyTo' = post_id::text
      OR ao.content->>'rootPost' = post_id::text
      OR ao.content->'content'->>'inReplyTo' = post_id::text
      OR ao.content->'content'->>'rootPost' = post_id::text
    )
  ORDER BY ao.created_at ASC
  LIMIT max_replies;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.queue_delete_for_federation()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF OLD.attributed_to IS NOT NULL THEN
    -- Create tombstone record (update existing row to Tombstone)
    UPDATE ap_objects SET
      type = 'Tombstone',
      content = jsonb_build_object(
        'type', 'Tombstone',
        'formerType', OLD.type,
        'deleted', now()
      ),
      updated_at = now()
    WHERE id = OLD.id;

    -- Queue delete activity for federation
    INSERT INTO federation_queue_partitioned (
      actor_id,
      activity,
      status,
      partition_key,
      priority
    ) VALUES (
      OLD.attributed_to,
      jsonb_build_object(
        '@context', 'https://www.w3.org/ns/activitystreams',
        'type', 'Delete',
        'actor', OLD.content->>'attributedTo',
        'object', jsonb_build_object(
          'type', 'Tombstone',
          'id', OLD.content->>'id',
          'formerType', OLD.type
        ),
        'to', jsonb_build_array('https://www.w3.org/ns/activitystreams#Public')
      ),
      'pending',
      actor_id_to_partition_key(OLD.attributed_to),
      8  -- High priority for deletes
    );

    -- Return NULL to cancel the actual DELETE (we converted to Tombstone instead)
    RETURN NULL;
  END IF;
  RETURN OLD;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.can_message_user(p_sender_id uuid, p_recipient_id uuid, p_job_post_id uuid DEFAULT NULL::uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    is_connected BOOLEAN := FALSE;
    has_job_conversation BOOLEAN := FALSE;
    job_active BOOLEAN := FALSE;
    recipient_is_remote BOOLEAN;
    recipient_actor_url TEXT;
BEGIN
    -- Cannot message yourself
    IF p_sender_id = p_recipient_id THEN
        RETURN jsonb_build_object(
            'can_message', FALSE,
            'is_federated', FALSE,
            'reason', 'cannot_message_self'
        );
    END IF;

    -- Check if job_post_id is provided (job inquiry context)
    IF p_job_post_id IS NOT NULL THEN
        -- Check if job is active
        SELECT is_active INTO job_active
        FROM job_posts
        WHERE id = p_job_post_id AND (user_id = p_recipient_id OR user_id = p_sender_id);

        IF job_active THEN
            RETURN jsonb_build_object(
                'can_message', TRUE,
                'is_federated', FALSE,
                'reason', 'job_inquiry'
            );
        END IF;

        -- Check if there's an existing conversation for this job
        SELECT EXISTS (
            SELECT 1 FROM job_conversations
            WHERE job_conversations.job_post_id = p_job_post_id
            AND ((applicant_id = p_sender_id AND poster_id = p_recipient_id)
                 OR (applicant_id = p_recipient_id AND poster_id = p_sender_id))
        ) INTO has_job_conversation;

        IF has_job_conversation THEN
            RETURN jsonb_build_object(
                'can_message', TRUE,
                'is_federated', FALSE,
                'reason', 'existing_job_conversation'
            );
        END IF;
    END IF;

    -- Use the existing are_users_connected function which correctly queries user_connections
    SELECT are_users_connected(p_sender_id, p_recipient_id) INTO is_connected;

    IF is_connected THEN
        RETURN jsonb_build_object(
            'can_message', TRUE,
            'is_federated', FALSE,
            'reason', 'connected'
        );
    END IF;

    -- Check if recipient is federated (has remote_actor_url in actors)
    SELECT a.is_remote, a.remote_actor_url
    INTO recipient_is_remote, recipient_actor_url
    FROM actors a WHERE a.user_id = p_recipient_id;

    IF recipient_is_remote = TRUE AND recipient_actor_url IS NOT NULL THEN
        RETURN jsonb_build_object(
            'can_message', TRUE,
            'is_federated', TRUE,
            'remote_actor_url', recipient_actor_url,
            'reason', 'federated_user'
        );
    END IF;

    -- Not connected and not federated
    RETURN jsonb_build_object(
        'can_message', FALSE,
        'is_federated', FALSE,
        'reason', 'not_connected'
    );
END;
$function$
;

CREATE VIEW public."public_profiles" AS  SELECT id,
    username,
    fullname,
    headline,
    avatar_url,
    location,
    bio,
    is_verified,
    is_freelancer,
    created_at,
    home_instance,
    freelancer_skills,
    freelancer_rate,
    freelancer_availability,
    website,
    header_url,
    auth_type,
    remote_actor_url
   FROM profiles;

CREATE VIEW public."public_actors" AS  SELECT id,
    user_id,
    preferred_username,
    type,
    status,
    public_key,
    follower_count,
    following_count,
    is_remote,
    remote_actor_url,
    remote_inbox_url,
    also_known_as,
    moved_to,
    created_at,
    updated_at
   FROM actors;

CREATE VIEW public."server_public_keys" AS  SELECT id,
    public_key,
    is_current,
    created_at
   FROM server_keys
  WHERE ((is_current = true) AND (revoked_at IS NULL));

CREATE VIEW public."public_education" AS  SELECT id,
    user_id,
    institution,
    degree,
    field,
    start_year,
    end_year,
    verification_status,
    created_at,
    updated_at
   FROM education;

CREATE VIEW public."public_experiences" AS  SELECT id,
    user_id,
    title,
    company,
    is_current_role,
    start_date,
    end_date,
    location,
    description,
    verification_status,
    company_domain,
    created_at,
    updated_at
   FROM experiences;

CREATE VIEW public."federated_sessions_safe" AS  SELECT id,
    profile_id,
    remote_instance,
    remote_actor_url,
    token_expires_at,
    last_verified_at,
    created_at,
    updated_at
   FROM federated_sessions;

CREATE VIEW public."federated_posts_with_moderation" AS  SELECT ap.id,
    ap.type,
    ap.content,
    ap.attributed_to,
    ap.published_at,
        CASE
            WHEN (ba.actor_url IS NOT NULL) THEN 'blocked_actor'::text
            WHEN (bd.host IS NOT NULL) THEN 'blocked_domain'::text
            ELSE 'allowed'::text
        END AS moderation_status,
    'local'::text AS source
   FROM ((ap_objects ap
     LEFT JOIN blocked_actors ba ON ((((ap.content ->> 'attributedTo'::text) = ba.actor_url) OR (((ap.content -> 'actor'::text) ->> 'id'::text) = ba.actor_url))))
     LEFT JOIN blocked_domains bd ON (((ap.content ->> 'attributedTo'::text) ~~ (('%'::text || bd.host) || '%'::text))));

CREATE VIEW public."federated_feed" AS  SELECT ap.id,
    ap.type,
    ap.content,
    ap.attributed_to,
    ap.company_id,
    ap.published_at,
        CASE
            WHEN (act.is_remote = true) THEN 'remote'::text
            ELSE 'local'::text
        END AS source
   FROM (ap_objects ap
     LEFT JOIN actors act ON ((ap.attributed_to = act.id)))
  WHERE ((ap.type = ANY (ARRAY['Note'::text, 'Article'::text, 'Create'::text, 'Announce'::text])) AND (((ap.type <> 'Announce'::text) AND ((ap.content ->> 'inReplyTo'::text) IS NULL) AND (((ap.content -> 'object'::text) ->> 'inReplyTo'::text) IS NULL)) OR (ap.type = 'Announce'::text)) AND (((ap.content ->> 'type'::text) IS NULL) OR ((ap.content ->> 'type'::text) <> 'Like'::text)))
  ORDER BY ap.published_at DESC;

CREATE VIEW public."follower_batch_stats" AS  SELECT a.id AS actor_id,
    a.preferred_username,
    count(fb.id) AS total_batches,
    count(fb.id) FILTER (WHERE (fb.status = 'pending'::text)) AS pending_batches,
    count(fb.id) FILTER (WHERE (fb.status = 'processed'::text)) AS processed_batches
   FROM (actors a
     LEFT JOIN follower_batches fb ON ((a.id = fb.actor_id)))
  GROUP BY a.id, a.preferred_username;

CREATE VIEW public."federation_queue_stats" AS  SELECT partition_key,
    (count(*))::integer AS total_count,
    (count(*) FILTER (WHERE (status = 'pending'::text)))::integer AS pending_count,
    (count(*) FILTER (WHERE (status = 'processing'::text)))::integer AS processing_count,
    (count(*) FILTER (WHERE (status = 'failed'::text)))::integer AS failed_count,
    (count(*) FILTER (WHERE (status = 'processed'::text)))::integer AS processed_count
   FROM federation_queue_partitioned
  GROUP BY partition_key;

CREATE TRIGGER update_outgoing_follows_timestamp BEFORE UPDATE ON public.outgoing_follows FOR EACH ROW EXECUTE FUNCTION update_outgoing_follows_updated_at();

CREATE TRIGGER set_partition_key BEFORE INSERT ON public.federation_queue_partitioned FOR EACH ROW EXECUTE FUNCTION set_federation_queue_partition_key();

CREATE TRIGGER update_mfa_recovery_requests_updated_at BEFORE UPDATE ON public.mfa_recovery_requests FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER on_article_created AFTER INSERT ON public.articles FOR EACH ROW EXECUTE FUNCTION handle_new_article();

CREATE TRIGGER trigger_update_endorsement_count AFTER INSERT OR DELETE ON public.skill_endorsements FOR EACH ROW EXECUTE FUNCTION update_endorsement_count();

CREATE TRIGGER update_cache_ttl BEFORE UPDATE ON public.remote_actors_cache FOR EACH ROW EXECUTE FUNCTION update_cache_on_access();

CREATE TRIGGER on_article_publish AFTER INSERT OR UPDATE ON public.articles FOR EACH ROW EXECUTE FUNCTION notify_followers_of_article();

CREATE TRIGGER on_post_reaction AFTER INSERT ON public.ap_objects FOR EACH ROW WHEN ((new.type = 'Like'::text)) EXECUTE FUNCTION notify_post_reaction();

CREATE TRIGGER on_post_reply AFTER INSERT ON public.post_replies FOR EACH ROW EXECUTE FUNCTION notify_post_reply();

CREATE TRIGGER update_pack_member_count AFTER INSERT OR DELETE ON public.starter_pack_members FOR EACH ROW EXECUTE FUNCTION update_starter_pack_member_count();

CREATE TRIGGER update_pack_follower_count AFTER INSERT OR DELETE ON public.user_followed_packs FOR EACH ROW EXECUTE FUNCTION update_starter_pack_follower_count();

CREATE TRIGGER calculate_job_transparency BEFORE INSERT OR UPDATE ON public.job_posts FOR EACH ROW EXECUTE FUNCTION calculate_job_transparency_score();

CREATE TRIGGER trigger_notify_followers_of_article AFTER INSERT OR UPDATE ON public.articles FOR EACH ROW EXECUTE FUNCTION notify_followers_of_article();

CREATE TRIGGER check_slug_immutable BEFORE UPDATE ON public.companies FOR EACH ROW EXECUTE FUNCTION prevent_slug_change();

CREATE TRIGGER company_search_vector_update BEFORE INSERT OR UPDATE ON public.companies FOR EACH ROW EXECUTE FUNCTION update_company_search_vector();

CREATE TRIGGER company_follower_count_trigger AFTER INSERT OR DELETE ON public.company_followers FOR EACH ROW EXECUTE FUNCTION update_company_follower_count();

CREATE TRIGGER company_employee_count_trigger AFTER INSERT OR DELETE OR UPDATE ON public.company_employees FOR EACH ROW EXECUTE FUNCTION update_company_employee_count();

CREATE TRIGGER company_employees_prevent_self_verification BEFORE UPDATE ON public.company_employees FOR EACH ROW EXECUTE FUNCTION prevent_self_verification();

CREATE TRIGGER update_site_alerts_updated_at BEFORE UPDATE ON public.site_alerts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_federate_deleted_post BEFORE DELETE ON public.ap_objects FOR EACH ROW WHEN ((old.type = ANY (ARRAY['Note'::text, 'Article'::text]))) EXECUTE FUNCTION queue_delete_for_federation();

CREATE TRIGGER update_profile_section_visibility_updated_at BEFORE UPDATE ON public.profile_section_visibility FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE POLICY "Users can view their own roles" ON public."user_roles" AS PERMISSIVE FOR SELECT TO "public" USING ((auth.uid() = user_id));

CREATE POLICY "Admins can manage all roles" ON public."user_roles" AS PERMISSIVE FOR ALL TO "public" USING (is_admin(auth.uid()));

CREATE POLICY "Users can update their own profile" ON public."profiles" AS PERMISSIVE FOR UPDATE TO "public" USING ((auth.uid() = id));

CREATE POLICY "Users can insert their own profile" ON public."profiles" AS PERMISSIVE FOR INSERT TO "public" WITH CHECK ((auth.uid() = id));

CREATE POLICY "Admins can manage signature cache" ON public."federation_signature_cache" AS PERMISSIVE FOR ALL TO "public" USING (is_admin(auth.uid()));

CREATE POLICY "Users can insert their own actor" ON public."actors" AS PERMISSIVE FOR INSERT TO "public" WITH CHECK ((auth.uid() = user_id));

CREATE POLICY "Users can update their own actor" ON public."actors" AS PERMISSIVE FOR UPDATE TO "public" USING ((auth.uid() = user_id));

CREATE POLICY "Anyone can view public posts" ON public."ap_objects" AS PERMISSIVE FOR SELECT TO "public" USING (true);

CREATE POLICY "Users can create posts via their actor" ON public."ap_objects" AS PERMISSIVE FOR INSERT TO "public" WITH CHECK ((EXISTS ( SELECT 1
   FROM actors
  WHERE ((actors.id = ap_objects.attributed_to) AND (actors.user_id = auth.uid())))));

CREATE POLICY "Users can update their own posts" ON public."ap_objects" AS PERMISSIVE FOR UPDATE TO "public" USING ((EXISTS ( SELECT 1
   FROM actors
  WHERE ((actors.id = ap_objects.attributed_to) AND (actors.user_id = auth.uid())))));

CREATE POLICY "Users can view their own profile views" ON public."profile_views" AS PERMISSIVE FOR SELECT TO "public" USING ((auth.uid() = profile_id));

CREATE POLICY "Anyone can insert profile views" ON public."profile_views" AS PERMISSIVE FOR INSERT TO "public" WITH CHECK (true);

CREATE POLICY "Users can delete their own posts" ON public."ap_objects" AS PERMISSIVE FOR DELETE TO "public" USING ((EXISTS ( SELECT 1
   FROM actors
  WHERE ((actors.id = ap_objects.attributed_to) AND (actors.user_id = auth.uid())))));

CREATE POLICY "Users can view their own settings" ON public."user_settings" AS PERMISSIVE FOR SELECT TO "public" USING ((auth.uid() = user_id));

CREATE POLICY "Users can manage their own settings" ON public."user_settings" AS PERMISSIVE FOR ALL TO "public" USING ((auth.uid() = user_id));

CREATE POLICY "Users can create connections" ON public."user_connections" AS PERMISSIVE FOR INSERT TO "public" WITH CHECK ((auth.uid() = user_id));

CREATE POLICY "Users can update their connections" ON public."user_connections" AS PERMISSIVE FOR UPDATE TO "public" USING (((auth.uid() = user_id) OR (auth.uid() = connected_user_id)));

CREATE POLICY "Users can delete their connections" ON public."user_connections" AS PERMISSIVE FOR DELETE TO "public" USING (((auth.uid() = user_id) OR (auth.uid() = connected_user_id)));

CREATE POLICY "Moderators can view all moderation actions" ON public."moderation_actions" AS PERMISSIVE FOR SELECT TO "public" USING ((is_moderator(auth.uid()) OR (is_public = true)));

CREATE POLICY "Moderators can create moderation actions" ON public."moderation_actions" AS PERMISSIVE FOR INSERT TO "public" WITH CHECK (is_moderator(auth.uid()));

CREATE POLICY "Users can view their own follows" ON public."outgoing_follows" AS PERMISSIVE FOR SELECT TO "public" USING ((EXISTS ( SELECT 1
   FROM actors
  WHERE ((actors.id = outgoing_follows.local_actor_id) AND (actors.user_id = auth.uid())))));

CREATE POLICY "Users can create follows via their actor" ON public."outgoing_follows" AS PERMISSIVE FOR INSERT TO "public" WITH CHECK ((EXISTS ( SELECT 1
   FROM actors
  WHERE ((actors.id = outgoing_follows.local_actor_id) AND (actors.user_id = auth.uid())))));

CREATE POLICY "Users can update their follows" ON public."outgoing_follows" AS PERMISSIVE FOR UPDATE TO "public" USING ((EXISTS ( SELECT 1
   FROM actors
  WHERE ((actors.id = outgoing_follows.local_actor_id) AND (actors.user_id = auth.uid())))));

CREATE POLICY "Anyone can view remote actors cache" ON public."remote_actors_cache" AS PERMISSIVE FOR SELECT TO "public" USING (true);

CREATE POLICY "Admins can manage federation queue" ON public."federation_queue_partitioned" AS PERMISSIVE FOR ALL TO "public" USING (is_admin(auth.uid()));

CREATE POLICY "Admins can manage follower batches" ON public."follower_batches" AS PERMISSIVE FOR ALL TO "public" USING (is_admin(auth.uid()));

CREATE POLICY "Anyone can view active alerts" ON public."site_alerts" AS PERMISSIVE FOR SELECT TO "public" USING ((is_active = true));

CREATE POLICY "Admins can manage alerts" ON public."site_alerts" AS PERMISSIVE FOR ALL TO "authenticated" USING ((is_admin(auth.uid()) OR is_moderator(auth.uid()))) WITH CHECK ((is_admin(auth.uid()) OR is_moderator(auth.uid())));

CREATE POLICY "Anyone can view blocked actors" ON public."blocked_actors" AS PERMISSIVE FOR SELECT TO "public" USING (true);

CREATE POLICY "Admins can manage blocked_actors" ON public."blocked_actors" AS PERMISSIVE FOR ALL TO "public" USING (is_admin(auth.uid()));

CREATE POLICY "Anyone can view blocked domains" ON public."blocked_domains" AS PERMISSIVE FOR SELECT TO "public" USING (true);

CREATE POLICY "Admins can manage blocked_domains" ON public."blocked_domains" AS PERMISSIVE FOR ALL TO "public" USING (is_admin(auth.uid()));

CREATE POLICY "Admins can manage activities" ON public."activities" AS PERMISSIVE FOR ALL TO "public" USING (is_admin(auth.uid()));

CREATE POLICY "Users can view activities for their actors" ON public."activities" AS PERMISSIVE FOR SELECT TO "public" USING ((EXISTS ( SELECT 1
   FROM actors
  WHERE ((actors.id = activities.actor_id) AND (actors.user_id = auth.uid())))));

CREATE POLICY "Admins can do all operations on federation_request_logs" ON public."federation_request_logs" AS PERMISSIVE FOR ALL TO "public" USING (is_admin(auth.uid()));

CREATE POLICY "Moderators can view federation_request_logs" ON public."federation_request_logs" AS PERMISSIVE FOR SELECT TO "public" USING (is_moderator(auth.uid()));

CREATE POLICY "User can manage own tokens" ON public."email_verification_tokens" AS PERMISSIVE FOR ALL TO "public" USING ((auth.uid() = user_id));

CREATE POLICY "Anyone can view remote instances" ON public."remote_instances" AS PERMISSIVE FOR SELECT TO "public" USING (true);

CREATE POLICY "Admins can manage remote instances" ON public."remote_instances" AS PERMISSIVE FOR ALL TO "public" USING (is_admin(auth.uid()));

CREATE POLICY "Anyone can view published articles" ON public."articles" AS PERMISSIVE FOR SELECT TO "public" USING (((published = true) OR (auth.uid() = user_id)));

CREATE POLICY "Users can manage their own articles" ON public."articles" AS PERMISSIVE FOR ALL TO "public" USING ((auth.uid() = user_id));

CREATE POLICY "Anyone can view article reactions" ON public."article_reactions" AS PERMISSIVE FOR SELECT TO "public" USING (true);

CREATE POLICY "Users can manage their own reactions" ON public."article_reactions" AS PERMISSIVE FOR ALL TO "public" USING ((auth.uid() = user_id));

CREATE POLICY "Users can manage their own events" ON public."events" AS PERMISSIVE FOR ALL TO "public" USING ((auth.uid() = user_id));

CREATE POLICY "Anyone can view active job posts" ON public."job_posts" AS PERMISSIVE FOR SELECT TO "public" USING (((is_active = true) OR (auth.uid() = user_id)));

CREATE POLICY "Users can view their own messages" ON public."messages" AS PERMISSIVE FOR SELECT TO "public" USING (((auth.uid() = sender_id) OR (auth.uid() = recipient_id)));

CREATE POLICY "Recipients can update messages (mark as read)" ON public."messages" AS PERMISSIVE FOR UPDATE TO "public" USING ((auth.uid() = recipient_id));

CREATE POLICY "Admins can manage newsletter subscribers" ON public."newsletter_subscribers" AS PERMISSIVE FOR ALL TO "public" USING (is_admin(auth.uid()));

CREATE POLICY "Anyone can view post replies" ON public."post_replies" AS PERMISSIVE FOR SELECT TO "public" USING (true);

CREATE POLICY "Users can manage their own replies" ON public."post_replies" AS PERMISSIVE FOR ALL TO "public" USING ((auth.uid() = user_id));

CREATE POLICY "Users can manage their own cv sections" ON public."cv_sections" AS PERMISSIVE FOR ALL TO "public" USING ((auth.uid() = user_id));

CREATE POLICY "Anyone can view article authors" ON public."article_authors" AS PERMISSIVE FOR SELECT TO "public" USING (true);

CREATE POLICY "Article owners can manage authors" ON public."article_authors" AS PERMISSIVE FOR ALL TO "public" USING (((EXISTS ( SELECT 1
   FROM articles
  WHERE ((articles.id = article_authors.article_id) AND (articles.user_id = auth.uid())))) OR (auth.uid() = user_id)));

CREATE POLICY "Anyone can view event RSVPs" ON public."event_rsvps" AS PERMISSIVE FOR SELECT TO "public" USING (true);

CREATE POLICY "Users can manage their own RSVPs" ON public."event_rsvps" AS PERMISSIVE FOR ALL TO "public" USING ((auth.uid() = user_id));

CREATE POLICY "Anyone can view followers" ON public."actor_followers" AS PERMISSIVE FOR SELECT TO "public" USING (true);

CREATE POLICY "Users can manage their actor followers" ON public."actor_followers" AS PERMISSIVE FOR ALL TO "public" USING ((EXISTS ( SELECT 1
   FROM actors
  WHERE ((actors.id = actor_followers.local_actor_id) AND (actors.user_id = auth.uid())))));

CREATE POLICY "Users can create referrals" ON public."referrals" AS PERMISSIVE FOR INSERT TO "public" WITH CHECK ((auth.uid() = referrer_id));

CREATE POLICY "Users can view their inbox items" ON public."inbox_items" AS PERMISSIVE FOR SELECT TO "public" USING ((EXISTS ( SELECT 1
   FROM actors
  WHERE ((actors.id = inbox_items.recipient_id) AND (actors.user_id = auth.uid())))));

CREATE POLICY "Users can manage their inbox items" ON public."inbox_items" AS PERMISSIVE FOR ALL TO "public" USING ((EXISTS ( SELECT 1
   FROM actors
  WHERE ((actors.id = inbox_items.recipient_id) AND (actors.user_id = auth.uid())))));

CREATE POLICY "Admins can manage auth_request_logs" ON public."auth_request_logs" AS PERMISSIVE FOR ALL TO "public" USING (is_admin(auth.uid()));

CREATE POLICY "Users can view their own invitations" ON public."event_invitations" AS PERMISSIVE FOR SELECT TO "public" USING ((auth.uid() = user_id));

CREATE POLICY "Admins insert audit" ON public."company_audit_log" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK ((has_company_role(auth.uid(), company_id, ARRAY['owner'::company_role, 'admin'::company_role]) AND (actor_user_id = auth.uid())));

CREATE POLICY "Invited users can update their invitation status" ON public."event_invitations" AS PERMISSIVE FOR UPDATE TO "public" USING ((auth.uid() = user_id));

CREATE POLICY "Users can view their own notifications" ON public."notifications" AS PERMISSIVE FOR SELECT TO "public" USING ((auth.uid() = recipient_id));

CREATE POLICY "Users can update their own notifications" ON public."notifications" AS PERMISSIVE FOR UPDATE TO "public" USING ((auth.uid() = recipient_id));

CREATE POLICY "Users can delete their own notifications" ON public."notifications" AS PERMISSIVE FOR DELETE TO "public" USING ((auth.uid() = recipient_id));

CREATE POLICY "Anyone can view endorsements" ON public."skill_endorsements" AS PERMISSIVE FOR SELECT TO "public" USING (true);

CREATE POLICY "Users can endorse skills" ON public."skill_endorsements" AS PERMISSIVE FOR INSERT TO "public" WITH CHECK (((auth.uid() = endorser_id) AND (endorser_id <> ( SELECT skills.user_id
   FROM skills
  WHERE (skills.id = skill_endorsements.skill_id)))));

CREATE POLICY "Users can remove their endorsements" ON public."skill_endorsements" AS PERMISSIVE FOR DELETE TO "public" USING ((auth.uid() = endorser_id));

CREATE POLICY "Anyone can view approved recommendations" ON public."recommendations" AS PERMISSIVE FOR SELECT TO "public" USING (((status = 'approved'::text) OR ((auth.uid() = recommender_id) OR (auth.uid() = recipient_id))));

CREATE POLICY "Users can create recommendations" ON public."recommendations" AS PERMISSIVE FOR INSERT TO "public" WITH CHECK ((auth.uid() = recommender_id));

CREATE POLICY "Recipients can update status" ON public."recommendations" AS PERMISSIVE FOR UPDATE TO "public" USING ((auth.uid() = recipient_id));

CREATE POLICY "Authors can delete their recommendations" ON public."recommendations" AS PERMISSIVE FOR DELETE TO "public" USING ((auth.uid() = recommender_id));

CREATE POLICY "Users can view their own blocks" ON public."user_blocks" AS PERMISSIVE FOR SELECT TO "public" USING ((auth.uid() = blocker_id));

CREATE POLICY "Users can create blocks" ON public."user_blocks" AS PERMISSIVE FOR INSERT TO "public" WITH CHECK (((auth.uid() = blocker_id) AND (blocker_id <> blocked_user_id)));

CREATE POLICY "Users can delete their own blocks" ON public."user_blocks" AS PERMISSIVE FOR DELETE TO "public" USING ((auth.uid() = blocker_id));

CREATE POLICY "Users can view their own referrals" ON public."referrals" AS PERMISSIVE FOR SELECT TO "public" USING (((auth.uid() = referrer_id) OR (auth.uid() = referred_user_id)));

CREATE POLICY "System can update referrals" ON public."referrals" AS PERMISSIVE FOR UPDATE TO "public" USING (((auth.uid() = referrer_id) OR (auth.uid() = referred_user_id)));

CREATE POLICY "Users can view their own saved items" ON public."saved_items" AS PERMISSIVE FOR SELECT TO "public" USING ((auth.uid() = user_id));

CREATE POLICY "Users can manage their own saved items" ON public."saved_items" AS PERMISSIVE FOR ALL TO "public" USING ((auth.uid() = user_id));

CREATE POLICY "Users can create reports" ON public."content_reports" AS PERMISSIVE FOR INSERT TO "public" WITH CHECK ((auth.uid() = reporter_id));

CREATE POLICY "Users can view their own reports" ON public."content_reports" AS PERMISSIVE FOR SELECT TO "public" USING ((auth.uid() = reporter_id));

CREATE POLICY "Moderators can view all reports" ON public."content_reports" AS PERMISSIVE FOR SELECT TO "public" USING (is_moderator(auth.uid()));

CREATE POLICY "Moderators can update reports" ON public."content_reports" AS PERMISSIVE FOR UPDATE TO "public" USING (is_moderator(auth.uid()));

CREATE POLICY "Admins can manage federation_alerts" ON public."federation_alerts" AS PERMISSIVE FOR ALL TO "public" USING (is_admin(auth.uid()));

CREATE POLICY "Moderators can view federation_alerts" ON public."federation_alerts" AS PERMISSIVE FOR SELECT TO "public" USING (is_moderator(auth.uid()));

CREATE POLICY "Users can insert own education" ON public."education" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK ((auth.uid() = user_id));

CREATE POLICY "Company editors can create posts" ON public."ap_objects" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (((company_id IS NOT NULL) AND has_company_role(auth.uid(), company_id, ARRAY['owner'::company_role, 'admin'::company_role, 'editor'::company_role])));

CREATE POLICY "Company admins can delete posts" ON public."ap_objects" AS PERMISSIVE FOR DELETE TO "authenticated" USING (((company_id IS NOT NULL) AND has_company_role(auth.uid(), company_id, ARRAY['owner'::company_role, 'admin'::company_role])));

CREATE POLICY "Users can view own experiences" ON public."experiences" AS PERMISSIVE FOR SELECT TO "authenticated" USING ((auth.uid() = user_id));

CREATE POLICY "Users can view own education" ON public."education" AS PERMISSIVE FOR SELECT TO "authenticated" USING ((auth.uid() = user_id));

CREATE POLICY "Users can view own skills" ON public."skills" AS PERMISSIVE FOR SELECT TO "authenticated" USING ((auth.uid() = user_id));

CREATE POLICY "Connected users can view skills" ON public."skills" AS PERMISSIVE FOR SELECT TO "authenticated" USING (are_users_connected_secure(auth.uid(), user_id));

CREATE POLICY "Users can insert own experiences" ON public."experiences" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK ((auth.uid() = user_id));

CREATE POLICY "Users can update own experiences" ON public."experiences" AS PERMISSIVE FOR UPDATE TO "authenticated" USING ((auth.uid() = user_id)) WITH CHECK ((auth.uid() = user_id));

CREATE POLICY "Users can delete own experiences" ON public."experiences" AS PERMISSIVE FOR DELETE TO "authenticated" USING ((auth.uid() = user_id));

CREATE POLICY "Users can update own education" ON public."education" AS PERMISSIVE FOR UPDATE TO "authenticated" USING ((auth.uid() = user_id)) WITH CHECK ((auth.uid() = user_id));

CREATE POLICY "Users can delete own education" ON public."education" AS PERMISSIVE FOR DELETE TO "authenticated" USING ((auth.uid() = user_id));

CREATE POLICY "Users can insert own skills" ON public."skills" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK ((auth.uid() = user_id));

CREATE POLICY "Users can update own skills" ON public."skills" AS PERMISSIVE FOR UPDATE TO "authenticated" USING ((auth.uid() = user_id)) WITH CHECK ((auth.uid() = user_id));

CREATE POLICY "Users can delete own skills" ON public."skills" AS PERMISSIVE FOR DELETE TO "authenticated" USING ((auth.uid() = user_id));

CREATE POLICY "Public view verified employees" ON public."company_employees" AS PERMISSIVE FOR SELECT TO "public" USING ((is_verified = true));

CREATE POLICY "Event owners can manage invitations" ON public."event_invitations" AS PERMISSIVE FOR ALL TO "public" USING (((auth.uid() = user_id) OR (auth.uid() = get_event_owner(event_id))));

CREATE POLICY "Admins view all employees" ON public."company_employees" AS PERMISSIVE FOR SELECT TO "authenticated" USING (has_company_role(auth.uid(), company_id, ARRAY['owner'::company_role, 'admin'::company_role]));

CREATE POLICY "Anyone can view author follows" ON public."author_follows" AS PERMISSIVE FOR SELECT TO "public" USING (true);

CREATE POLICY "Users can follow authors" ON public."author_follows" AS PERMISSIVE FOR INSERT TO "public" WITH CHECK ((auth.uid() = follower_id));

CREATE POLICY "Users can unfollow authors" ON public."author_follows" AS PERMISSIVE FOR DELETE TO "public" USING ((auth.uid() = follower_id));

CREATE POLICY "Users view own employment" ON public."company_employees" AS PERMISSIVE FOR SELECT TO "authenticated" USING ((auth.uid() = user_id));

CREATE POLICY "Users view own role" ON public."company_roles" AS PERMISSIVE FOR SELECT TO "authenticated" USING ((user_id = auth.uid()));

CREATE POLICY "System can create notifications" ON public."notifications" AS PERMISSIVE FOR INSERT TO "public" WITH CHECK (((auth.jwt() ->> 'role'::text) = 'service_role'::text));

CREATE POLICY "Anyone can read webfinger cache" ON public."webfinger_cache" AS PERMISSIVE FOR SELECT TO "public" USING (true);

CREATE POLICY "Anyone can view reactions" ON public."reactions" AS PERMISSIVE FOR SELECT TO "public" USING (true);

CREATE POLICY "Users can insert their own reactions" ON public."reactions" AS PERMISSIVE FOR INSERT TO "public" WITH CHECK ((auth.uid() = user_id));

CREATE POLICY "Users can update their own reactions" ON public."reactions" AS PERMISSIVE FOR UPDATE TO "public" USING ((auth.uid() = user_id));

CREATE POLICY "Users can delete their own reactions" ON public."reactions" AS PERMISSIVE FOR DELETE TO "public" USING ((auth.uid() = user_id));

CREATE POLICY "Only service role can write webfinger cache" ON public."webfinger_cache" AS PERMISSIVE FOR INSERT TO "public" WITH CHECK (((auth.jwt() ->> 'role'::text) = 'service_role'::text));

CREATE POLICY "Only service role can update webfinger cache" ON public."webfinger_cache" AS PERMISSIVE FOR UPDATE TO "public" USING (((auth.jwt() ->> 'role'::text) = 'service_role'::text));

CREATE POLICY "Only service role can delete webfinger cache" ON public."webfinger_cache" AS PERMISSIVE FOR DELETE TO "public" USING (((auth.jwt() ->> 'role'::text) = 'service_role'::text));

CREATE POLICY "Users can update their custom feeds" ON public."custom_feeds" AS PERMISSIVE FOR UPDATE TO "public" USING ((auth.uid() = user_id));

CREATE POLICY "Users can upsert own section visibility" ON public."profile_section_visibility" AS PERMISSIVE FOR INSERT TO "public" WITH CHECK ((auth.uid() = user_id));

CREATE POLICY "Users can update own section visibility" ON public."profile_section_visibility" AS PERMISSIVE FOR UPDATE TO "public" USING ((auth.uid() = user_id));

CREATE POLICY "Authenticated users can read all visibility settings" ON public."profile_section_visibility" AS PERMISSIVE FOR SELECT TO "authenticated" USING (true);

CREATE POLICY "Users can delete their custom feeds" ON public."custom_feeds" AS PERMISSIVE FOR DELETE TO "public" USING ((auth.uid() = user_id));

CREATE POLICY "Service role manages remote actors cache (update)" ON public."remote_actors_cache" AS PERMISSIVE FOR UPDATE TO "public" USING ((auth.role() = 'service_role'::text)) WITH CHECK ((auth.role() = 'service_role'::text));

CREATE POLICY "Starter packs are viewable by everyone" ON public."starter_packs" AS PERMISSIVE FOR SELECT TO "public" USING (true);

CREATE POLICY "Users can create starter packs" ON public."starter_packs" AS PERMISSIVE FOR INSERT TO "public" WITH CHECK ((auth.uid() = creator_id));

CREATE POLICY "Creators can update their packs" ON public."starter_packs" AS PERMISSIVE FOR UPDATE TO "public" USING ((auth.uid() = creator_id));

CREATE POLICY "Creators can delete their packs" ON public."starter_packs" AS PERMISSIVE FOR DELETE TO "public" USING ((auth.uid() = creator_id));

CREATE POLICY "Pack members are viewable by everyone" ON public."starter_pack_members" AS PERMISSIVE FOR SELECT TO "public" USING (true);

CREATE POLICY "Pack creators can add members" ON public."starter_pack_members" AS PERMISSIVE FOR INSERT TO "public" WITH CHECK ((EXISTS ( SELECT 1
   FROM starter_packs
  WHERE ((starter_packs.id = starter_pack_members.pack_id) AND (starter_packs.creator_id = auth.uid())))));

CREATE POLICY "Pack creators can remove members" ON public."starter_pack_members" AS PERMISSIVE FOR DELETE TO "public" USING ((EXISTS ( SELECT 1
   FROM starter_packs
  WHERE ((starter_packs.id = starter_pack_members.pack_id) AND (starter_packs.creator_id = auth.uid())))));

CREATE POLICY "Users can view their followed packs" ON public."user_followed_packs" AS PERMISSIVE FOR SELECT TO "public" USING ((auth.uid() = user_id));

CREATE POLICY "Users can follow packs" ON public."user_followed_packs" AS PERMISSIVE FOR INSERT TO "public" WITH CHECK ((auth.uid() = user_id));

CREATE POLICY "Users can unfollow packs" ON public."user_followed_packs" AS PERMISSIVE FOR DELETE TO "public" USING ((auth.uid() = user_id));

CREATE POLICY "Users can view their own feed preferences" ON public."user_feed_preferences" AS PERMISSIVE FOR SELECT TO "public" USING ((auth.uid() = user_id));

CREATE POLICY "Users can create their feed preferences" ON public."user_feed_preferences" AS PERMISSIVE FOR INSERT TO "public" WITH CHECK ((auth.uid() = user_id));

CREATE POLICY "Users can update their feed preferences" ON public."user_feed_preferences" AS PERMISSIVE FOR UPDATE TO "public" USING ((auth.uid() = user_id));

CREATE POLICY "Users can view own and public feeds" ON public."custom_feeds" AS PERMISSIVE FOR SELECT TO "public" USING (((auth.uid() = user_id) OR (is_public = true)));

CREATE POLICY "Users can create custom feeds" ON public."custom_feeds" AS PERMISSIVE FOR INSERT TO "public" WITH CHECK ((auth.uid() = user_id));

CREATE POLICY "Users can view their sent and received requests" ON public."message_requests" AS PERMISSIVE FOR SELECT TO "public" USING (((auth.uid() = sender_id) OR (auth.uid() = recipient_id)));

CREATE POLICY "Users can send message requests" ON public."message_requests" AS PERMISSIVE FOR INSERT TO "public" WITH CHECK ((auth.uid() = sender_id));

CREATE POLICY "Recipients can update request status" ON public."message_requests" AS PERMISSIVE FOR UPDATE TO "public" USING ((auth.uid() = recipient_id));

CREATE POLICY "Senders can delete their requests" ON public."message_requests" AS PERMISSIVE FOR DELETE TO "public" USING ((auth.uid() = sender_id));

CREATE POLICY "Users can view own cv sections" ON public."cv_sections" AS PERMISSIVE FOR SELECT TO "authenticated" USING ((auth.uid() = user_id));

CREATE POLICY "Anyone can read remote actors cache" ON public."remote_actors_cache" AS PERMISSIVE FOR SELECT TO "public" USING (true);

CREATE POLICY "Users can send messages" ON public."messages" AS PERMISSIVE FOR INSERT TO "public" WITH CHECK (((auth.uid() = sender_id) AND (are_users_connected(auth.uid(), recipient_id) OR (EXISTS ( SELECT 1
   FROM actors
  WHERE ((actors.user_id = messages.recipient_id) AND (actors.is_remote = true)))) OR (is_federated = true))));

CREATE POLICY "Authenticated users can insert remote actors cache" ON public."remote_actors_cache" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (true);

CREATE POLICY "Service role manages webfinger cache" ON public."webfinger_cache" AS PERMISSIVE FOR ALL TO "public" USING ((auth.role() = 'service_role'::text)) WITH CHECK ((auth.role() = 'service_role'::text));

CREATE POLICY "Only admins can view oauth_clients" ON public."oauth_clients" AS PERMISSIVE FOR SELECT TO "public" USING (is_admin(auth.uid()));

CREATE POLICY "Users can insert own federated sessions" ON public."federated_sessions" AS PERMISSIVE FOR INSERT TO "public" WITH CHECK ((auth.uid() = profile_id));

CREATE POLICY "Users can update own federated sessions" ON public."federated_sessions" AS PERMISSIVE FOR UPDATE TO "public" USING ((auth.uid() = profile_id));

CREATE POLICY "Deny all client access to server_keys" ON public."server_keys" AS PERMISSIVE FOR ALL TO "public" USING (false) WITH CHECK (false);

CREATE POLICY "Users can vote on polls" ON public."poll_votes" AS PERMISSIVE FOR INSERT TO "public" WITH CHECK ((auth.uid() = user_id));

CREATE POLICY "Users can remove own votes" ON public."poll_votes" AS PERMISSIVE FOR DELETE TO "public" USING ((auth.uid() = user_id));

CREATE POLICY "No direct access to federated sessions tokens" ON public."federated_sessions" AS PERMISSIVE FOR SELECT TO "public" USING (false);

CREATE POLICY "Users can view own consents" ON public."user_consents" AS PERMISSIVE FOR SELECT TO "public" USING ((auth.uid() = user_id));

CREATE POLICY "Users can insert own consents" ON public."user_consents" AS PERMISSIVE FOR INSERT TO "public" WITH CHECK ((auth.uid() = user_id));

CREATE POLICY "Users can only see their own votes" ON public."poll_votes" AS PERMISSIVE FOR SELECT TO "public" USING ((auth.uid() = user_id));

CREATE POLICY "No direct access to password reset codes" ON public."password_reset_codes" AS PERMISSIVE FOR SELECT TO "public" USING (false);

CREATE POLICY "Moderators can view bans" ON public."user_bans" AS PERMISSIVE FOR SELECT TO "public" USING (is_moderator(auth.uid()));

CREATE POLICY "Moderators can create bans" ON public."user_bans" AS PERMISSIVE FOR INSERT TO "public" WITH CHECK (is_moderator(auth.uid()));

CREATE POLICY "Moderators can update bans" ON public."user_bans" AS PERMISSIVE FOR UPDATE TO "public" USING (is_moderator(auth.uid()));

CREATE POLICY "Anyone can view public events" ON public."events" AS PERMISSIVE FOR SELECT TO "public" USING (((visibility = 'public'::text) OR (user_id = auth.uid()) OR ((visibility = 'connections'::text) AND (auth.uid() IS NOT NULL) AND (EXISTS ( SELECT 1
   FROM user_connections
  WHERE ((user_connections.status = 'accepted'::text) AND (((user_connections.user_id = auth.uid()) AND (user_connections.connected_user_id = events.user_id)) OR ((user_connections.connected_user_id = auth.uid()) AND (user_connections.user_id = events.user_id))))))) OR ((visibility = 'private'::text) AND (auth.uid() IS NOT NULL) AND is_user_invited_to_event(id, auth.uid()))));

CREATE POLICY "Users can view their job conversations" ON public."job_conversations" AS PERMISSIVE FOR SELECT TO "public" USING (((auth.uid() = applicant_id) OR (auth.uid() = poster_id)));

CREATE POLICY "Users can create job conversations" ON public."job_conversations" AS PERMISSIVE FOR INSERT TO "public" WITH CHECK ((auth.uid() = applicant_id));

CREATE POLICY "Users can insert their own job posts" ON public."job_posts" AS PERMISSIVE FOR INSERT TO "public" WITH CHECK ((auth.uid() = user_id));

CREATE POLICY "Anyone can submit MFA recovery request" ON public."mfa_recovery_requests" AS PERMISSIVE FOR INSERT TO "anon","authenticated" WITH CHECK (true);

CREATE POLICY "Moderators can view recovery requests" ON public."mfa_recovery_requests" AS PERMISSIVE FOR SELECT TO "authenticated" USING (is_moderator(auth.uid()));

CREATE POLICY "Users can update their own job posts" ON public."job_posts" AS PERMISSIVE FOR UPDATE TO "public" USING ((auth.uid() = user_id)) WITH CHECK ((auth.uid() = user_id));

CREATE POLICY "Users can delete their own job posts" ON public."job_posts" AS PERMISSIVE FOR DELETE TO "public" USING ((auth.uid() = user_id));

CREATE POLICY "Anyone can view accepted connections" ON public."user_connections" AS PERMISSIVE FOR SELECT TO "public" USING ((status = 'accepted'::text));

CREATE POLICY "Users can view their own pending connections" ON public."user_connections" AS PERMISSIVE FOR SELECT TO "public" USING (((status = 'pending'::text) AND ((auth.uid() = user_id) OR (auth.uid() = connected_user_id))));

CREATE POLICY "Users can view own actor with private key" ON public."actors" AS PERMISSIVE FOR SELECT TO "public" USING ((auth.uid() = user_id));

CREATE POLICY "Users can view own full profile" ON public."profiles" AS PERMISSIVE FOR SELECT TO "public" USING ((auth.uid() = id));

CREATE POLICY "Users can view own digest tracking" ON public."notification_digest_tracking" AS PERMISSIVE FOR SELECT TO "public" USING ((auth.uid() = user_id));

CREATE POLICY "Service role can manage digest tracking" ON public."notification_digest_tracking" AS PERMISSIVE FOR ALL TO "public" USING ((auth.role() = 'service_role'::text));

CREATE POLICY "Anon can read public visibility settings" ON public."profile_section_visibility" AS PERMISSIVE FOR SELECT TO "anon" USING ((visibility = 'everyone'::section_visibility));

CREATE POLICY "Moderators can update recovery requests" ON public."mfa_recovery_requests" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (is_moderator(auth.uid())) WITH CHECK (is_moderator(auth.uid()));

CREATE POLICY "Admins can view recovery tokens" ON public."mfa_recovery_tokens" AS PERMISSIVE FOR SELECT TO "public" USING (is_admin(auth.uid()));

CREATE POLICY "Users can delete own federated sessions" ON public."federated_sessions" AS PERMISSIVE FOR DELETE TO "public" USING ((auth.uid() = profile_id));

CREATE POLICY "Public view active" ON public."companies" AS PERMISSIVE FOR SELECT TO "public" USING ((is_active = true));

CREATE POLICY "Admin update" ON public."companies" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (has_company_role(auth.uid(), id, ARRAY['owner'::company_role, 'admin'::company_role])) WITH CHECK (true);

CREATE POLICY "Admins view roles" ON public."company_roles" AS PERMISSIVE FOR SELECT TO "authenticated" USING (has_company_role(auth.uid(), company_id, ARRAY['owner'::company_role, 'admin'::company_role]));

CREATE POLICY "Owners add roles" ON public."company_roles" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (has_company_role(auth.uid(), company_id, ARRAY['owner'::company_role]));

CREATE POLICY "Owners update roles" ON public."company_roles" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (has_company_role(auth.uid(), company_id, ARRAY['owner'::company_role]));

CREATE POLICY "Owners delete roles" ON public."company_roles" AS PERMISSIVE FOR DELETE TO "authenticated" USING ((has_company_role(auth.uid(), company_id, ARRAY['owner'::company_role]) AND (NOT ((role = 'owner'::company_role) AND (user_id = auth.uid())))));

CREATE POLICY "Auth view followers" ON public."company_followers" AS PERMISSIVE FOR SELECT TO "authenticated" USING (true);

CREATE POLICY "User follow" ON public."company_followers" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK ((auth.uid() = user_id));

CREATE POLICY "User unfollow" ON public."company_followers" AS PERMISSIVE FOR DELETE TO "authenticated" USING ((auth.uid() = user_id));

CREATE POLICY "User claim employment" ON public."company_employees" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK ((auth.uid() = user_id));

CREATE POLICY "User update own" ON public."company_employees" AS PERMISSIVE FOR UPDATE TO "authenticated" USING ((auth.uid() = user_id));

CREATE POLICY "Admin update employees" ON public."company_employees" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (has_company_role(auth.uid(), company_id, ARRAY['owner'::company_role, 'admin'::company_role]));

CREATE POLICY "User delete own" ON public."company_employees" AS PERMISSIVE FOR DELETE TO "authenticated" USING ((auth.uid() = user_id));

CREATE POLICY "Admin delete employees" ON public."company_employees" AS PERMISSIVE FOR DELETE TO "authenticated" USING (has_company_role(auth.uid(), company_id, ARRAY['owner'::company_role, 'admin'::company_role]));

CREATE POLICY "Admins view audit" ON public."company_audit_log" AS PERMISSIVE FOR SELECT TO "authenticated" USING (has_company_role(auth.uid(), company_id, ARRAY['owner'::company_role, 'admin'::company_role]));

CREATE POLICY "Users view own claims" ON public."company_claim_requests" AS PERMISSIVE FOR SELECT TO "authenticated" USING ((requester_user_id = auth.uid()));

CREATE POLICY "Admins view claims" ON public."company_claim_requests" AS PERMISSIVE FOR SELECT TO "authenticated" USING (has_company_role(auth.uid(), company_id, ARRAY['owner'::company_role, 'admin'::company_role]));

CREATE POLICY "User create claim" ON public."company_claim_requests" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK ((requester_user_id = auth.uid()));

CREATE POLICY "Public view reserved slugs" ON public."reserved_company_slugs" AS PERMISSIVE FOR SELECT TO "public" USING (true);

GRANT ALL ON ALL TABLES IN SCHEMA public TO anon,authenticated,service_role;
GRANT ALL ON storage.objects TO anon,authenticated,service_role;
