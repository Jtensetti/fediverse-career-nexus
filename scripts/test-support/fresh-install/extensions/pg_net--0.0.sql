CREATE SCHEMA IF NOT EXISTS net;
CREATE FUNCTION net.http_post(url text, body jsonb DEFAULT '{}', params jsonb DEFAULT '{}', headers jsonb DEFAULT '{}', timeout_milliseconds integer DEFAULT 5000)
RETURNS bigint LANGUAGE sql AS $$ SELECT 0::bigint $$;
CREATE FUNCTION net.http_get(url text, params jsonb DEFAULT '{}', headers jsonb DEFAULT '{}', timeout_milliseconds integer DEFAULT 5000)
RETURNS bigint LANGUAGE sql AS $$ SELECT 0::bigint $$;
