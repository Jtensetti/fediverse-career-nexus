-- Create poll_votes table
CREATE TABLE public.poll_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  poll_id UUID NOT NULL REFERENCES ap_objects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  option_index INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(poll_id, user_id, option_index)
);

-- Enable RLS
ALTER TABLE public.poll_votes ENABLE ROW LEVEL SECURITY;

-- Users can vote on polls
CREATE POLICY "Users can vote on polls" 
ON public.poll_votes 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Anyone can see votes (for counting)
CREATE POLICY "Anyone can see poll votes" 
ON public.poll_votes 
FOR SELECT 
USING (true);

-- Users can remove their own votes
CREATE POLICY "Users can remove own votes" 
ON public.poll_votes 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create function to get poll vote counts
CREATE OR REPLACE FUNCTION public.get_poll_results(poll_uuid UUID)
RETURNS TABLE(option_index INTEGER, vote_count BIGINT)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT 
    pv.option_index,
    COUNT(*) as vote_count
  FROM poll_votes pv
  WHERE pv.poll_id = poll_uuid
  GROUP BY pv.option_index
  ORDER BY pv.option_index;
$$;

-- Create function to check if user has voted
CREATE OR REPLACE FUNCTION public.has_user_voted(poll_uuid UUID, check_user_id UUID)
RETURNS TABLE(option_index INTEGER)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT pv.option_index
  FROM poll_votes pv
  WHERE pv.poll_id = poll_uuid AND pv.user_id = check_user_id;
$$;