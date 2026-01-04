-- Fix security issues and add remaining tables
-- =====================================================

-- 1. Enable RLS on auth_request_logs
ALTER TABLE public.auth_request_logs ENABLE ROW LEVEL SECURITY;

-- Only allow service role to access this table (no policies = service role only)

-- 2. Fix views to use SECURITY INVOKER instead of SECURITY DEFINER
DROP VIEW IF EXISTS public.federation_queue_stats CASCADE;
DROP VIEW IF EXISTS public.follower_batch_stats CASCADE;

CREATE VIEW public.federation_queue_stats
WITH (security_invoker = true)
AS SELECT * FROM public.get_federation_queue_stats();

CREATE VIEW public.follower_batch_stats
WITH (security_invoker = true)
AS SELECT 
    a.id as actor_id,
    a.preferred_username,
    COUNT(fb.id) as total_batches,
    COUNT(fb.id) FILTER (WHERE fb.status = 'pending') as pending_batches,
    COUNT(fb.id) FILTER (WHERE fb.status = 'processed') as processed_batches
FROM public.actors a
LEFT JOIN public.follower_batches fb ON a.id = fb.actor_id
GROUP BY a.id, a.preferred_username;

-- 3. ARTICLES TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS public.articles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    excerpt TEXT,
    cover_image_url TEXT,
    published BOOLEAN DEFAULT false,
    published_at TIMESTAMPTZ,
    slug TEXT UNIQUE,
    tags TEXT[],
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_articles_user ON public.articles(user_id);
CREATE INDEX IF NOT EXISTS idx_articles_published ON public.articles(published);
CREATE INDEX IF NOT EXISTS idx_articles_slug ON public.articles(slug);

ALTER TABLE public.articles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view published articles"
ON public.articles FOR SELECT
USING (published = true OR auth.uid() = user_id);

CREATE POLICY "Users can manage their own articles"
ON public.articles FOR ALL
USING (auth.uid() = user_id);

-- 4. ARTICLE REACTIONS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS public.article_reactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    article_id UUID NOT NULL REFERENCES public.articles(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    emoji TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(article_id, user_id, emoji)
);

CREATE INDEX IF NOT EXISTS idx_article_reactions_article ON public.article_reactions(article_id);
CREATE INDEX IF NOT EXISTS idx_article_reactions_user ON public.article_reactions(user_id);

ALTER TABLE public.article_reactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view article reactions"
ON public.article_reactions FOR SELECT
USING (true);

CREATE POLICY "Users can manage their own reactions"
ON public.article_reactions FOR ALL
USING (auth.uid() = user_id);

-- 5. EVENTS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS public.events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    location TEXT,
    start_date TIMESTAMPTZ NOT NULL,
    end_date TIMESTAMPTZ,
    cover_image_url TEXT,
    is_online BOOLEAN DEFAULT false,
    meeting_url TEXT,
    max_attendees INTEGER,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_events_user ON public.events(user_id);
CREATE INDEX IF NOT EXISTS idx_events_start_date ON public.events(start_date);

ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view events"
ON public.events FOR SELECT
USING (true);

CREATE POLICY "Users can manage their own events"
ON public.events FOR ALL
USING (auth.uid() = user_id);

-- 6. EVENT ATTENDEES TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS public.event_attendees (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    status TEXT DEFAULT 'attending',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(event_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_event_attendees_event ON public.event_attendees(event_id);

ALTER TABLE public.event_attendees ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view event attendees"
ON public.event_attendees FOR SELECT
USING (true);

CREATE POLICY "Users can manage their own attendance"
ON public.event_attendees FOR ALL
USING (auth.uid() = user_id);

-- 7. JOB POSTS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS public.job_posts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    company TEXT NOT NULL,
    description TEXT,
    location TEXT,
    remote_policy TEXT DEFAULT 'on-site',
    salary_min INTEGER,
    salary_max INTEGER,
    salary_currency TEXT DEFAULT 'USD',
    employment_type TEXT DEFAULT 'full-time',
    experience_level TEXT,
    skills TEXT[],
    is_active BOOLEAN DEFAULT true,
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_job_posts_user ON public.job_posts(user_id);
CREATE INDEX IF NOT EXISTS idx_job_posts_active ON public.job_posts(is_active);

ALTER TABLE public.job_posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active job posts"
ON public.job_posts FOR SELECT
USING (is_active = true OR auth.uid() = user_id);

CREATE POLICY "Users can manage their own job posts"
ON public.job_posts FOR ALL
USING (auth.uid() = user_id);

-- 8. MESSAGES TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS public.messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    recipient_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    read_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_messages_sender ON public.messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_recipient ON public.messages(recipient_id);
CREATE INDEX IF NOT EXISTS idx_messages_created ON public.messages(created_at DESC);

ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own messages"
ON public.messages FOR SELECT
USING (auth.uid() = sender_id OR auth.uid() = recipient_id);

CREATE POLICY "Users can send messages"
ON public.messages FOR INSERT
WITH CHECK (auth.uid() = sender_id);

CREATE POLICY "Recipients can update messages (mark as read)"
ON public.messages FOR UPDATE
USING (auth.uid() = recipient_id);

-- 9. NEWSLETTER SUBSCRIBERS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS public.newsletter_subscribers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT NOT NULL UNIQUE,
    confirmed BOOLEAN DEFAULT false,
    confirm_token TEXT,
    unsubscribed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_newsletter_email ON public.newsletter_subscribers(email);

ALTER TABLE public.newsletter_subscribers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage newsletter subscribers"
ON public.newsletter_subscribers FOR ALL
USING (public.is_admin(auth.uid()));

-- 10. POST REACTIONS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS public.post_reactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    post_id UUID NOT NULL REFERENCES public.ap_objects(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    emoji TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(post_id, user_id, emoji)
);

CREATE INDEX IF NOT EXISTS idx_post_reactions_post ON public.post_reactions(post_id);

ALTER TABLE public.post_reactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view post reactions"
ON public.post_reactions FOR SELECT
USING (true);

CREATE POLICY "Users can manage their own reactions"
ON public.post_reactions FOR ALL
USING (auth.uid() = user_id);

-- 11. POST REPLIES TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS public.post_replies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    post_id UUID NOT NULL REFERENCES public.ap_objects(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_post_replies_post ON public.post_replies(post_id);

ALTER TABLE public.post_replies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view post replies"
ON public.post_replies FOR SELECT
USING (true);

CREATE POLICY "Users can manage their own replies"
ON public.post_replies FOR ALL
USING (auth.uid() = user_id);

-- 12. POST BOOSTS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS public.post_boosts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    post_id UUID NOT NULL REFERENCES public.ap_objects(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(post_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_post_boosts_post ON public.post_boosts(post_id);

ALTER TABLE public.post_boosts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view post boosts"
ON public.post_boosts FOR SELECT
USING (true);

CREATE POLICY "Users can manage their own boosts"
ON public.post_boosts FOR ALL
USING (auth.uid() = user_id);

-- 13. CV SECTIONS TABLE (for profile CVs)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.cv_sections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    section_type TEXT NOT NULL,
    title TEXT,
    content JSONB,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cv_sections_user ON public.cv_sections(user_id);

ALTER TABLE public.cv_sections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view cv sections"
ON public.cv_sections FOR SELECT
USING (true);

CREATE POLICY "Users can manage their own cv sections"
ON public.cv_sections FOR ALL
USING (auth.uid() = user_id);