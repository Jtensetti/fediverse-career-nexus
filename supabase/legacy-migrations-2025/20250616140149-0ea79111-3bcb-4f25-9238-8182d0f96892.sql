
-- Add foreign key relationships for user_connections table
ALTER TABLE user_connections 
ADD CONSTRAINT fk_user_connections_user_id 
FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;

ALTER TABLE user_connections 
ADD CONSTRAINT fk_user_connections_connected_user_id 
FOREIGN KEY (connected_user_id) REFERENCES profiles(id) ON DELETE CASCADE;

-- Drop dependent views first
DROP VIEW IF EXISTS federated_posts_with_moderation CASCADE;
DROP VIEW IF EXISTS federated_feed CASCADE;

-- Recreate the federated_feed view with proper joins to profiles
-- Ensure the view runs with the permissions of the caller rather than
-- the creator. Explicitly setting security_invoker avoids linter
-- warnings about SECURITY DEFINER views.
CREATE VIEW federated_feed
WITH (security_invoker=true) AS
SELECT 
  ap.id,
  ap.content,
  ap.attributed_to,
  ap.published_at,
  ap.type,
  CASE 
    WHEN p.id IS NOT NULL THEN 'local'
    ELSE 'remote'
  END as source
FROM ap_objects ap
LEFT JOIN profiles p ON ap.attributed_to = p.id
WHERE ap.type = 'Create'
ORDER BY ap.published_at DESC;

-- Recreate the federated_posts_with_moderation view
-- Like federated_feed, recreate the moderated posts view with
-- SECURITY INVOKER enabled so queries respect the caller's RLS
-- context instead of the view creator.
CREATE VIEW federated_posts_with_moderation
WITH (security_invoker=true) AS
SELECT 
  ap.id,
  ap.content,
  ap.attributed_to,
  ap.published_at,
  ap.type,
  CASE 
    WHEN p.id IS NOT NULL THEN 'local'
    ELSE 'remote'
  END as source,
  'approved' as moderation_status  -- Default to approved for now
FROM ap_objects ap
LEFT JOIN profiles p ON ap.attributed_to = p.id
WHERE ap.type = 'Create'
ORDER BY ap.published_at DESC;
