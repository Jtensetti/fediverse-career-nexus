-- =====================================================
-- NOLTO COMPREHENSIVE FEATURE MIGRATION (FIXED)
-- Phases 1-6: Starter Packs, Feed Control, Messaging, Jobs, Events
-- =====================================================

-- =====================================================
-- PHASE 1: STARTER PACKS SYSTEM
-- =====================================================

-- Starter packs: curated lists of users to follow
CREATE TABLE IF NOT EXISTS public.starter_packs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,
  category TEXT DEFAULT 'community',
  cover_image_url TEXT,
  is_featured BOOLEAN DEFAULT false,
  member_count INTEGER DEFAULT 0,
  follower_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Members of each starter pack
CREATE TABLE IF NOT EXISTS public.starter_pack_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pack_id UUID NOT NULL REFERENCES public.starter_packs(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  added_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  added_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (pack_id, user_id)
);

-- Track which packs users have followed
CREATE TABLE IF NOT EXISTS public.user_followed_packs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  pack_id UUID NOT NULL REFERENCES public.starter_packs(id) ON DELETE CASCADE,
  followed_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (user_id, pack_id)
);

-- Indexes for starter packs
CREATE INDEX IF NOT EXISTS idx_starter_packs_slug ON public.starter_packs(slug);
CREATE INDEX IF NOT EXISTS idx_starter_packs_category ON public.starter_packs(category);
CREATE INDEX IF NOT EXISTS idx_starter_packs_featured ON public.starter_packs(is_featured) WHERE is_featured = true;
CREATE INDEX IF NOT EXISTS idx_starter_pack_members_pack ON public.starter_pack_members(pack_id);
CREATE INDEX IF NOT EXISTS idx_starter_pack_members_user ON public.starter_pack_members(user_id);
CREATE INDEX IF NOT EXISTS idx_user_followed_packs_user ON public.user_followed_packs(user_id);

-- RLS for starter_packs
ALTER TABLE public.starter_packs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Starter packs are viewable by everyone" ON public.starter_packs;
CREATE POLICY "Starter packs are viewable by everyone"
  ON public.starter_packs FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can create starter packs" ON public.starter_packs;
CREATE POLICY "Users can create starter packs"
  ON public.starter_packs FOR INSERT WITH CHECK (auth.uid() = creator_id);

DROP POLICY IF EXISTS "Creators can update their packs" ON public.starter_packs;
CREATE POLICY "Creators can update their packs"
  ON public.starter_packs FOR UPDATE USING (auth.uid() = creator_id);

DROP POLICY IF EXISTS "Creators can delete their packs" ON public.starter_packs;
CREATE POLICY "Creators can delete their packs"
  ON public.starter_packs FOR DELETE USING (auth.uid() = creator_id);

-- RLS for starter_pack_members
ALTER TABLE public.starter_pack_members ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Pack members are viewable by everyone" ON public.starter_pack_members;
CREATE POLICY "Pack members are viewable by everyone"
  ON public.starter_pack_members FOR SELECT USING (true);

DROP POLICY IF EXISTS "Pack creators can add members" ON public.starter_pack_members;
CREATE POLICY "Pack creators can add members"
  ON public.starter_pack_members FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM public.starter_packs WHERE id = pack_id AND creator_id = auth.uid()));

DROP POLICY IF EXISTS "Pack creators can remove members" ON public.starter_pack_members;
CREATE POLICY "Pack creators can remove members"
  ON public.starter_pack_members FOR DELETE
  USING (EXISTS (SELECT 1 FROM public.starter_packs WHERE id = pack_id AND creator_id = auth.uid()));

-- RLS for user_followed_packs
ALTER TABLE public.user_followed_packs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their followed packs" ON public.user_followed_packs;
CREATE POLICY "Users can view their followed packs"
  ON public.user_followed_packs FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can follow packs" ON public.user_followed_packs;
CREATE POLICY "Users can follow packs"
  ON public.user_followed_packs FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can unfollow packs" ON public.user_followed_packs;
CREATE POLICY "Users can unfollow packs"
  ON public.user_followed_packs FOR DELETE USING (auth.uid() = user_id);

-- Function to update member count
CREATE OR REPLACE FUNCTION public.update_starter_pack_member_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.starter_packs SET member_count = member_count + 1, updated_at = now() WHERE id = NEW.pack_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.starter_packs SET member_count = GREATEST(0, member_count - 1), updated_at = now() WHERE id = OLD.pack_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS update_pack_member_count ON public.starter_pack_members;
CREATE TRIGGER update_pack_member_count
  AFTER INSERT OR DELETE ON public.starter_pack_members
  FOR EACH ROW EXECUTE FUNCTION public.update_starter_pack_member_count();

-- Function to update follower count
CREATE OR REPLACE FUNCTION public.update_starter_pack_follower_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.starter_packs SET follower_count = follower_count + 1, updated_at = now() WHERE id = NEW.pack_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.starter_packs SET follower_count = GREATEST(0, follower_count - 1), updated_at = now() WHERE id = OLD.pack_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS update_pack_follower_count ON public.user_followed_packs;
CREATE TRIGGER update_pack_follower_count
  AFTER INSERT OR DELETE ON public.user_followed_packs
  FOR EACH ROW EXECUTE FUNCTION public.update_starter_pack_follower_count();

-- =====================================================
-- PHASE 2: FEED CONTROL SYSTEM
-- =====================================================

CREATE TABLE IF NOT EXISTS public.user_feed_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  default_feed TEXT DEFAULT 'following',
  show_reposts BOOLEAN DEFAULT true,
  show_replies BOOLEAN DEFAULT false,
  language_filter TEXT[] DEFAULT NULL,
  muted_words TEXT[] DEFAULT ARRAY[]::TEXT[],
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.custom_feeds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  icon TEXT DEFAULT 'filter',
  rules JSONB NOT NULL DEFAULT '{}',
  is_public BOOLEAN DEFAULT false,
  position INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_user_feed_preferences_user ON public.user_feed_preferences(user_id);
CREATE INDEX IF NOT EXISTS idx_custom_feeds_user ON public.custom_feeds(user_id);
CREATE INDEX IF NOT EXISTS idx_custom_feeds_public ON public.custom_feeds(is_public) WHERE is_public = true;

ALTER TABLE public.user_feed_preferences ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own feed preferences" ON public.user_feed_preferences;
CREATE POLICY "Users can view their own feed preferences"
  ON public.user_feed_preferences FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create their feed preferences" ON public.user_feed_preferences;
CREATE POLICY "Users can create their feed preferences"
  ON public.user_feed_preferences FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their feed preferences" ON public.user_feed_preferences;
CREATE POLICY "Users can update their feed preferences"
  ON public.user_feed_preferences FOR UPDATE USING (auth.uid() = user_id);

ALTER TABLE public.custom_feeds ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own and public feeds" ON public.custom_feeds;
CREATE POLICY "Users can view own and public feeds"
  ON public.custom_feeds FOR SELECT USING (auth.uid() = user_id OR is_public = true);

DROP POLICY IF EXISTS "Users can create custom feeds" ON public.custom_feeds;
CREATE POLICY "Users can create custom feeds"
  ON public.custom_feeds FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their custom feeds" ON public.custom_feeds;
CREATE POLICY "Users can update their custom feeds"
  ON public.custom_feeds FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their custom feeds" ON public.custom_feeds;
CREATE POLICY "Users can delete their custom feeds"
  ON public.custom_feeds FOR DELETE USING (auth.uid() = user_id);

-- =====================================================
-- PHASE 3: MESSAGE REQUESTS & SAFETY
-- =====================================================

ALTER TABLE public.profiles 
  ADD COLUMN IF NOT EXISTS dm_privacy TEXT DEFAULT 'connections',
  ADD COLUMN IF NOT EXISTS trust_level INTEGER DEFAULT 0;

CREATE TABLE IF NOT EXISTS public.message_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  recipient_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  preview_text TEXT,
  intro_template TEXT,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT now(),
  responded_at TIMESTAMPTZ,
  UNIQUE(sender_id, recipient_id)
);

CREATE TABLE IF NOT EXISTS public.user_cw_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  auto_expand_cws BOOLEAN DEFAULT false,
  hidden_cw_tags TEXT[] DEFAULT ARRAY[]::TEXT[],
  always_show_cw_tags TEXT[] DEFAULT ARRAY[]::TEXT[],
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.ap_objects ADD COLUMN IF NOT EXISTS content_warning TEXT;

CREATE INDEX IF NOT EXISTS idx_message_requests_sender ON public.message_requests(sender_id);
CREATE INDEX IF NOT EXISTS idx_message_requests_recipient ON public.message_requests(recipient_id);
CREATE INDEX IF NOT EXISTS idx_message_requests_status ON public.message_requests(status) WHERE status = 'pending';

ALTER TABLE public.message_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their sent and received requests" ON public.message_requests;
CREATE POLICY "Users can view their sent and received requests"
  ON public.message_requests FOR SELECT USING (auth.uid() = sender_id OR auth.uid() = recipient_id);

DROP POLICY IF EXISTS "Users can send message requests" ON public.message_requests;
CREATE POLICY "Users can send message requests"
  ON public.message_requests FOR INSERT WITH CHECK (auth.uid() = sender_id);

DROP POLICY IF EXISTS "Recipients can update request status" ON public.message_requests;
CREATE POLICY "Recipients can update request status"
  ON public.message_requests FOR UPDATE USING (auth.uid() = recipient_id);

DROP POLICY IF EXISTS "Senders can delete their requests" ON public.message_requests;
CREATE POLICY "Senders can delete their requests"
  ON public.message_requests FOR DELETE USING (auth.uid() = sender_id);

ALTER TABLE public.user_cw_preferences ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own CW preferences" ON public.user_cw_preferences;
CREATE POLICY "Users can view their own CW preferences"
  ON public.user_cw_preferences FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create their CW preferences" ON public.user_cw_preferences;
CREATE POLICY "Users can create their CW preferences"
  ON public.user_cw_preferences FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their CW preferences" ON public.user_cw_preferences;
CREATE POLICY "Users can update their CW preferences"
  ON public.user_cw_preferences FOR UPDATE USING (auth.uid() = user_id);

-- =====================================================
-- PHASE 5: CROSS-POSTING SETTINGS
-- =====================================================

CREATE TABLE IF NOT EXISTS public.cross_post_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  mastodon_handle TEXT,
  bluesky_handle TEXT,
  auto_crosspost BOOLEAN DEFAULT false,
  crosspost_scope TEXT DEFAULT 'public',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.cross_post_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own cross-post settings" ON public.cross_post_settings;
CREATE POLICY "Users can view their own cross-post settings"
  ON public.cross_post_settings FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create their cross-post settings" ON public.cross_post_settings;
CREATE POLICY "Users can create their cross-post settings"
  ON public.cross_post_settings FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their cross-post settings" ON public.cross_post_settings;
CREATE POLICY "Users can update their cross-post settings"
  ON public.cross_post_settings FOR UPDATE USING (auth.uid() = user_id);

-- =====================================================
-- PHASE 6: JOB TRANSPARENCY FIELDS
-- =====================================================

ALTER TABLE public.job_posts
  ADD COLUMN IF NOT EXISTS interview_process TEXT,
  ADD COLUMN IF NOT EXISTS response_time TEXT,
  ADD COLUMN IF NOT EXISTS team_size TEXT,
  ADD COLUMN IF NOT EXISTS growth_path TEXT,
  ADD COLUMN IF NOT EXISTS visa_sponsorship BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS transparency_score INTEGER DEFAULT 0;

CREATE OR REPLACE FUNCTION public.calculate_job_transparency_score()
RETURNS TRIGGER AS $$
DECLARE
  score INTEGER := 0;
BEGIN
  IF NEW.salary_min IS NOT NULL AND NEW.salary_max IS NOT NULL THEN score := score + 25; END IF;
  IF NEW.remote_policy IS NOT NULL THEN score := score + 15; END IF;
  IF NEW.interview_process IS NOT NULL AND length(NEW.interview_process) > 10 THEN score := score + 20; END IF;
  IF NEW.response_time IS NOT NULL THEN score := score + 15; END IF;
  IF NEW.team_size IS NOT NULL THEN score := score + 10; END IF;
  IF NEW.growth_path IS NOT NULL THEN score := score + 10; END IF;
  IF NEW.visa_sponsorship IS NOT NULL THEN score := score + 5; END IF;
  NEW.transparency_score := score;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

DROP TRIGGER IF EXISTS calculate_job_transparency ON public.job_posts;
CREATE TRIGGER calculate_job_transparency
  BEFORE INSERT OR UPDATE ON public.job_posts
  FOR EACH ROW EXECUTE FUNCTION public.calculate_job_transparency_score();

-- =====================================================
-- SEED DATA: FEATURED STARTER PACKS
-- =====================================================

INSERT INTO public.starter_packs (name, slug, description, category, is_featured) VALUES
  ('Open Source Builders', 'open-source', 'Connect with developers, maintainers, and contributors building open source software.', 'community', true),
  ('Nordic Tech', 'nordic-tech', 'Professionals from Sweden, Norway, Denmark, Finland, and Iceland building the future.', 'region', true),
  ('AI & Machine Learning', 'ai-ml', 'Researchers, engineers, and practitioners working on artificial intelligence.', 'topic', true),
  ('Climate Tech', 'climate-tech', 'People building solutions for climate change and sustainability.', 'industry', true),
  ('Product & Design', 'product-design', 'Product managers, UX designers, and design engineers shaping user experiences.', 'community', true),
  ('Fediverse Enthusiasts', 'fediverse', 'Advocates and builders of the decentralized social web.', 'community', true),
  ('Tech Policy', 'tech-policy', 'Policy makers, researchers, and advocates working on technology governance.', 'topic', true),
  ('Startup Founders', 'founders', 'Entrepreneurs building and scaling startups across industries.', 'community', true)
ON CONFLICT (slug) DO NOTHING;