-- Fix RLS policy for job_posts to properly allow INSERT
-- Drop the existing policy and recreate with proper INSERT support
DROP POLICY IF EXISTS "Users can manage their own job posts" ON public.job_posts;

-- Create separate policies for each operation
CREATE POLICY "Users can insert their own job posts"
ON public.job_posts FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own job posts"
ON public.job_posts FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own job posts"
ON public.job_posts FOR DELETE
USING (auth.uid() = user_id);