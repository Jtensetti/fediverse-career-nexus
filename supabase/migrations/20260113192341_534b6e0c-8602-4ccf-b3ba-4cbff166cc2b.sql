-- Create dedicated reactions table for posts and comments
CREATE TABLE public.reactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  target_type text NOT NULL CHECK (target_type IN ('post', 'reply')),
  target_id uuid NOT NULL,
  user_id uuid NOT NULL,
  reaction text NOT NULL CHECK (reaction IN ('love', 'celebrate', 'support', 'empathy', 'insightful')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT reactions_unique_user_target UNIQUE (target_type, target_id, user_id)
);

-- Create indexes for performance
CREATE INDEX idx_reactions_target ON public.reactions(target_type, target_id);
CREATE INDEX idx_reactions_user ON public.reactions(user_id);

-- Enable RLS
ALTER TABLE public.reactions ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Anyone can view reactions"
  ON public.reactions FOR SELECT
  USING (true);

CREATE POLICY "Users can insert their own reactions"
  ON public.reactions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own reactions"
  ON public.reactions FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own reactions"
  ON public.reactions FOR DELETE
  USING (auth.uid() = user_id);