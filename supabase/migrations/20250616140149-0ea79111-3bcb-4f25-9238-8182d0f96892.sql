
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
CREATE VIEW federated_feed AS
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
CREATE VIEW federated_posts_with_moderation AS
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
