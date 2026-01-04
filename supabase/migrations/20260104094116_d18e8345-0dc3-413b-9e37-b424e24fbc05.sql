-- =====================================================
-- PHASE 1: NOTIFICATIONS SYSTEM
-- =====================================================

-- Create notifications table
CREATE TABLE public.notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  type TEXT NOT NULL, -- 'connection_request', 'connection_accepted', 'endorsement', 'message', 'job_application', 'mention', 'follow', 'like', 'boost', 'reply'
  recipient_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  actor_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  content TEXT,
  object_id TEXT, -- ID of the related object (post, job, article, etc.)
  object_type TEXT, -- 'post', 'job', 'article', 'event', 'profile', 'skill'
  read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Policies for notifications
CREATE POLICY "Users can view their own notifications"
ON public.notifications FOR SELECT
USING (auth.uid() = recipient_id);

CREATE POLICY "Users can update their own notifications"
ON public.notifications FOR UPDATE
USING (auth.uid() = recipient_id);

CREATE POLICY "System can create notifications"
ON public.notifications FOR INSERT
WITH CHECK (true);

CREATE POLICY "Users can delete their own notifications"
ON public.notifications FOR DELETE
USING (auth.uid() = recipient_id);

-- Index for fast queries
CREATE INDEX idx_notifications_recipient ON public.notifications(recipient_id, created_at DESC);
CREATE INDEX idx_notifications_unread ON public.notifications(recipient_id) WHERE read = false;

-- =====================================================
-- PHASE 2: SKILL ENDORSEMENTS
-- =====================================================

-- Create skill endorsements table
CREATE TABLE public.skill_endorsements (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  skill_id UUID NOT NULL REFERENCES public.skills(id) ON DELETE CASCADE,
  endorser_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(skill_id, endorser_id)
);

-- Enable RLS
ALTER TABLE public.skill_endorsements ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Anyone can view endorsements"
ON public.skill_endorsements FOR SELECT
USING (true);

CREATE POLICY "Users can endorse skills"
ON public.skill_endorsements FOR INSERT
WITH CHECK (
  auth.uid() = endorser_id
  AND endorser_id != (SELECT user_id FROM public.skills WHERE id = skill_id)
);

CREATE POLICY "Users can remove their endorsements"
ON public.skill_endorsements FOR DELETE
USING (auth.uid() = endorser_id);

-- Index for fast lookups
CREATE INDEX idx_endorsements_skill ON public.skill_endorsements(skill_id);
CREATE INDEX idx_endorsements_endorser ON public.skill_endorsements(endorser_id);

-- Update skills endorsement count trigger
CREATE OR REPLACE FUNCTION public.update_endorsement_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.skills SET endorsements = COALESCE(endorsements, 0) + 1 WHERE id = NEW.skill_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.skills SET endorsements = GREATEST(COALESCE(endorsements, 0) - 1, 0) WHERE id = OLD.skill_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER trigger_update_endorsement_count
AFTER INSERT OR DELETE ON public.skill_endorsements
FOR EACH ROW EXECUTE FUNCTION public.update_endorsement_count();

-- =====================================================
-- PHASE 3: FULL-TEXT SEARCH INDEXES
-- =====================================================

-- Add search vectors
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS search_vector tsvector
  GENERATED ALWAYS AS (
    setweight(to_tsvector('english', COALESCE(fullname, '')), 'A') ||
    setweight(to_tsvector('english', COALESCE(username, '')), 'A') ||
    setweight(to_tsvector('english', COALESCE(headline, '')), 'B') ||
    setweight(to_tsvector('english', COALESCE(bio, '')), 'C') ||
    setweight(to_tsvector('english', COALESCE(location, '')), 'D')
  ) STORED;

ALTER TABLE public.job_posts ADD COLUMN IF NOT EXISTS search_vector tsvector
  GENERATED ALWAYS AS (
    setweight(to_tsvector('english', COALESCE(title, '')), 'A') ||
    setweight(to_tsvector('english', COALESCE(company, '')), 'A') ||
    setweight(to_tsvector('english', COALESCE(description, '')), 'B') ||
    setweight(to_tsvector('english', COALESCE(location, '')), 'C')
  ) STORED;

ALTER TABLE public.articles ADD COLUMN IF NOT EXISTS search_vector tsvector
  GENERATED ALWAYS AS (
    setweight(to_tsvector('english', COALESCE(title, '')), 'A') ||
    setweight(to_tsvector('english', COALESCE(excerpt, '')), 'B') ||
    setweight(to_tsvector('english', COALESCE(content, '')), 'C')
  ) STORED;

ALTER TABLE public.events ADD COLUMN IF NOT EXISTS search_vector tsvector
  GENERATED ALWAYS AS (
    setweight(to_tsvector('english', COALESCE(title, '')), 'A') ||
    setweight(to_tsvector('english', COALESCE(description, '')), 'B') ||
    setweight(to_tsvector('english', COALESCE(location, '')), 'C')
  ) STORED;

-- Create GIN indexes for fast full-text search
CREATE INDEX IF NOT EXISTS idx_profiles_search ON public.profiles USING GIN(search_vector);
CREATE INDEX IF NOT EXISTS idx_jobs_search ON public.job_posts USING GIN(search_vector);
CREATE INDEX IF NOT EXISTS idx_articles_search ON public.articles USING GIN(search_vector);
CREATE INDEX IF NOT EXISTS idx_events_search ON public.events USING GIN(search_vector);

-- =====================================================
-- PHASE 4: RECOMMENDATIONS SYSTEM
-- =====================================================

CREATE TABLE public.recommendations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  recommender_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  recipient_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  relationship TEXT NOT NULL, -- 'colleague', 'manager', 'direct_report', 'client', 'mentor', 'other'
  position_at_time TEXT, -- Recommender's position when giving recommendation
  content TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'approved', 'rejected', 'requested'
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT different_users CHECK (recommender_id != recipient_id)
);

-- Enable RLS
ALTER TABLE public.recommendations ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Anyone can view approved recommendations"
ON public.recommendations FOR SELECT
USING (status = 'approved' OR auth.uid() IN (recommender_id, recipient_id));

CREATE POLICY "Users can create recommendations"
ON public.recommendations FOR INSERT
WITH CHECK (auth.uid() = recommender_id);

CREATE POLICY "Recipients can update status"
ON public.recommendations FOR UPDATE
USING (auth.uid() = recipient_id);

CREATE POLICY "Authors can delete their recommendations"
ON public.recommendations FOR DELETE
USING (auth.uid() = recommender_id);

CREATE INDEX idx_recommendations_recipient ON public.recommendations(recipient_id) WHERE status = 'approved';
CREATE INDEX idx_recommendations_recommender ON public.recommendations(recommender_id);

-- Enable realtime for notifications
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;