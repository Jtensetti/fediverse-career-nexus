-- Add index for faster reaction batch queries
CREATE INDEX IF NOT EXISTS idx_reactions_target_batch ON reactions(target_type, target_id);

-- Add index for faster boost queries by type
CREATE INDEX IF NOT EXISTS idx_ap_objects_type_announce ON ap_objects(type) WHERE type = 'Announce';

-- Add index for faster reply queries
CREATE INDEX IF NOT EXISTS idx_ap_objects_type_note ON ap_objects(type) WHERE type = 'Note';