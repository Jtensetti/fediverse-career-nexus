-- Isolated fresh-install harness ONLY. Emulates the objects a Supabase Postgres image
-- provides before project migrations run (roles, auth/storage schemas, realtime
-- publication, extensions schema). It contains no application schema, no users and no
-- credentials, and must never be applied to a hosted database.
DO $$ BEGIN
  IF current_database() NOT LIKE 'nolto_fresh_%' THEN RAISE EXCEPTION 'platform stub refuses database %', current_database(); END IF;
END $$;

CREATE ROLE anon NOLOGIN NOINHERIT;
CREATE ROLE authenticated NOLOGIN NOINHERIT;
CREATE ROLE service_role NOLOGIN NOINHERIT BYPASSRLS;
CREATE ROLE supabase_auth_admin NOLOGIN;
CREATE ROLE supabase_storage_admin NOLOGIN;
CREATE ROLE authenticator NOLOGIN NOINHERIT;
GRANT anon, authenticated, service_role TO authenticator;

CREATE SCHEMA extensions;
CREATE EXTENSION pgcrypto WITH SCHEMA extensions;
CREATE EXTENSION "uuid-ossp" WITH SCHEMA extensions;
GRANT USAGE ON SCHEMA extensions, public TO anon, authenticated, service_role;
DO $$ BEGIN EXECUTE format('ALTER DATABASE %I SET search_path = "$user", public, extensions', current_database()); END $$;
SET search_path = "$user", public, extensions;

CREATE SCHEMA auth;
GRANT USAGE ON SCHEMA auth TO anon, authenticated, service_role;
CREATE FUNCTION auth.jwt() RETURNS jsonb LANGUAGE sql STABLE AS
$$ SELECT coalesce(nullif(current_setting('request.jwt.claims', true), ''), '{}')::jsonb $$;
CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS
$$ SELECT nullif(coalesce(current_setting('request.jwt.claim.sub', true), auth.jwt()->>'sub'), '')::uuid $$;
CREATE FUNCTION auth.role() RETURNS text LANGUAGE sql STABLE AS
$$ SELECT nullif(coalesce(current_setting('request.jwt.claim.role', true), auth.jwt()->>'role'), '') $$;
CREATE FUNCTION auth.email() RETURNS text LANGUAGE sql STABLE AS $$ SELECT auth.jwt()->>'email' $$;
CREATE TABLE auth.users (
  instance_id uuid, id uuid PRIMARY KEY, aud text, role text, email text, encrypted_password text,
  email_confirmed_at timestamptz, confirmed_at timestamptz, last_sign_in_at timestamptz,
  raw_app_meta_data jsonb DEFAULT '{}', raw_user_meta_data jsonb DEFAULT '{}', is_super_admin boolean,
  phone text, is_anonymous boolean NOT NULL DEFAULT false, banned_until timestamptz, deleted_at timestamptz,
  created_at timestamptz DEFAULT now(), updated_at timestamptz DEFAULT now()
);
CREATE TABLE auth.identities (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  provider text NOT NULL, provider_id text NOT NULL, identity_data jsonb NOT NULL DEFAULT '{}', email text, created_at timestamptz DEFAULT now());
CREATE TABLE auth.sessions (id uuid PRIMARY KEY, user_id uuid NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  aal text, not_after timestamptz, created_at timestamptz DEFAULT now(), updated_at timestamptz DEFAULT now());
CREATE TABLE auth.mfa_factors (id uuid PRIMARY KEY, user_id uuid NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  factor_type text, status text, created_at timestamptz DEFAULT now(), updated_at timestamptz DEFAULT now());
CREATE TABLE auth.refresh_tokens (id bigserial PRIMARY KEY, user_id text, session_id uuid REFERENCES auth.sessions ON DELETE CASCADE, token text, revoked boolean);

CREATE SCHEMA storage;
GRANT USAGE ON SCHEMA storage TO anon, authenticated, service_role;
CREATE TABLE storage.buckets (id text PRIMARY KEY, name text NOT NULL UNIQUE, owner uuid, public boolean DEFAULT false,
  file_size_limit bigint, allowed_mime_types text[], created_at timestamptz DEFAULT now(), updated_at timestamptz DEFAULT now());
CREATE TABLE storage.objects (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), bucket_id text REFERENCES storage.buckets(id),
  name text, owner uuid, owner_id text, metadata jsonb, path_tokens text[] GENERATED ALWAYS AS (string_to_array(name, '/')) STORED,
  created_at timestamptz DEFAULT now(), updated_at timestamptz DEFAULT now(), last_accessed_at timestamptz DEFAULT now());
ALTER TABLE storage.buckets ENABLE ROW LEVEL SECURITY;
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;
GRANT ALL ON storage.buckets, storage.objects TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON storage.objects TO anon, authenticated;
GRANT SELECT ON storage.buckets TO anon, authenticated;
CREATE FUNCTION storage.foldername(name text) RETURNS text[] LANGUAGE sql IMMUTABLE AS
$$ SELECT (string_to_array(name, '/'))[1:array_length(string_to_array(name, '/'), 1) - 1] $$;
CREATE FUNCTION storage.filename(name text) RETURNS text LANGUAGE sql IMMUTABLE AS
$$ SELECT (string_to_array(name, '/'))[array_length(string_to_array(name, '/'), 1)] $$;
CREATE FUNCTION storage.extension(name text) RETURNS text LANGUAGE sql IMMUTABLE AS
$$ SELECT reverse(split_part(reverse(name), '.', 1)) $$;

CREATE SCHEMA vault;
CREATE TABLE vault.secrets (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), name text UNIQUE, secret text);
CREATE VIEW vault.decrypted_secrets AS SELECT id, name, secret AS decrypted_secret FROM vault.secrets;

CREATE PUBLICATION supabase_realtime;
