-- Minimal pre-migration schema for isolated PostgreSQL/PGlite regression tests.
-- This is not a replacement for replaying migrations against staging.
CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role BYPASSRLS;
CREATE SCHEMA auth;
CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql AS $$ SELECT nullif(current_setting('test.uid', true),'')::uuid $$;
CREATE FUNCTION auth.role() RETURNS text LANGUAGE sql AS $$ SELECT current_setting('test.role', true) $$;
CREATE TABLE auth.users (id uuid PRIMARY KEY, email text, email_confirmed_at timestamptz, raw_user_meta_data jsonb DEFAULT '{}');
CREATE TABLE public.profiles (id uuid PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE, username text UNIQUE, fullname text, created_at timestamptz DEFAULT now(), updated_at timestamptz DEFAULT now());
CREATE TABLE public.actors (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid REFERENCES auth.users ON DELETE CASCADE, preferred_username text NOT NULL, type text DEFAULT 'Person', status text DEFAULT 'active', is_remote boolean DEFAULT false, private_key text, public_key text, also_known_as text[], manually_approves_followers boolean DEFAULT false, moved_to text, created_at timestamptz DEFAULT now(), updated_at timestamptz DEFAULT now());
ALTER TABLE public.actors ENABLE ROW LEVEL SECURITY;
CREATE VIEW public.public_actors AS SELECT id,user_id,preferred_username,type,status,is_remote,public_key,also_known_as,manually_approves_followers,moved_to,created_at,updated_at FROM public.actors;
GRANT SELECT ON public.public_actors TO anon,authenticated;
CREATE TABLE public.user_roles (user_id uuid, role text, UNIQUE(user_id,role));
CREATE TABLE public.user_settings (user_id uuid UNIQUE,theme text,show_network_connections boolean);
CREATE TABLE public.server_keys (id uuid DEFAULT gen_random_uuid(),private_key text);
CREATE TABLE public.email_verification_tokens (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid REFERENCES auth.users ON DELETE CASCADE, token text NOT NULL, expires_at timestamptz NOT NULL, used_at timestamptz);
CREATE TABLE public.ap_objects (id uuid PRIMARY KEY DEFAULT gen_random_uuid(),attributed_to uuid REFERENCES public.actors ON DELETE CASCADE,type text,content jsonb,published_at timestamptz DEFAULT now(),created_at timestamptz DEFAULT now(),updated_at timestamptz DEFAULT now());
CREATE TABLE public.actor_followers (id uuid PRIMARY KEY DEFAULT gen_random_uuid(),local_actor_id uuid, follower_actor_url text,status text);
CREATE TABLE public.outgoing_follows (id uuid PRIMARY KEY DEFAULT gen_random_uuid(),local_actor_id uuid,remote_actor_url text,status text);
CREATE TABLE public.federation_queue_partitioned (id uuid DEFAULT gen_random_uuid(),actor_id uuid,activity jsonb,partition_key integer,status text,attempts integer DEFAULT 0,max_attempts integer DEFAULT 10,next_retry_at timestamptz DEFAULT now(),processed_at timestamptz,scheduled_for timestamptz,priority integer,created_at timestamptz DEFAULT now(),PRIMARY KEY(id,partition_key));
CREATE FUNCTION public.actor_id_to_partition_key(actor_uuid uuid) RETURNS integer LANGUAGE sql AS $$ SELECT abs(hashtext(actor_uuid::text)::bigint)::integer % 16 $$;
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT USAGE ON SCHEMA public,auth TO anon,authenticated,service_role;
GRANT SELECT ON auth.users TO service_role;
