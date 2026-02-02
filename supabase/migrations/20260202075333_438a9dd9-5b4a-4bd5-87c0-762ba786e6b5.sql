-- Fix poll_votes security: Remove public read access and keep only owner-based access
-- This prevents user voting patterns from being tracked/profiled

-- Drop the overly permissive "Anyone can see poll votes" policy
DROP POLICY IF EXISTS "Anyone can see poll votes" ON public.poll_votes;

-- The existing "Users can only see their own votes" policy already correctly restricts SELECT to owner
-- Verify it exists (it should from the schema):
-- Policy: Users can only see their own votes - USING (auth.uid() = user_id)

-- Also ensure poll results can still be retrieved via aggregated counts (through RPC functions)
-- The get_poll_results RPC function should use SECURITY DEFINER to aggregate counts without exposing individual votes