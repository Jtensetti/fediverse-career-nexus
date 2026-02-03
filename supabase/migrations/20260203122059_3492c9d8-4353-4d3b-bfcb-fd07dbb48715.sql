-- Drop and recreate the delete policy with updated logic
DROP POLICY IF EXISTS "Users can delete own federated sessions" ON federated_sessions;

CREATE POLICY "Users can delete own federated sessions"
ON federated_sessions FOR DELETE
USING (auth.uid() = profile_id);