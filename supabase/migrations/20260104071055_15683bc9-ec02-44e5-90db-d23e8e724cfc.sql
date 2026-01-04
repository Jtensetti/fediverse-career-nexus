-- Add remaining missing tables
-- =====================================================

-- 1. ARTICLE AUTHORS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS public.article_authors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    article_id UUID NOT NULL REFERENCES public.articles(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    is_primary BOOLEAN DEFAULT false,
    can_edit BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(article_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_article_authors_article ON public.article_authors(article_id);
CREATE INDEX IF NOT EXISTS idx_article_authors_user ON public.article_authors(user_id);

ALTER TABLE public.article_authors ENABLE ROW LEVEL SECURITY;

-- Drop existing policies first to avoid conflicts
DROP POLICY IF EXISTS "Anyone can view article authors" ON public.article_authors;
DROP POLICY IF EXISTS "Article owners can manage authors" ON public.article_authors;

CREATE POLICY "Anyone can view article authors"
ON public.article_authors FOR SELECT
USING (true);

CREATE POLICY "Article owners can manage authors"
ON public.article_authors FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.articles 
    WHERE articles.id = article_authors.article_id 
    AND articles.user_id = auth.uid()
  )
  OR auth.uid() = user_id
);

-- 2. EVENT RSVPs TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS public.event_rsvps (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    status TEXT DEFAULT 'going',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(event_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_event_rsvps_event ON public.event_rsvps(event_id);
CREATE INDEX IF NOT EXISTS idx_event_rsvps_user ON public.event_rsvps(user_id);

ALTER TABLE public.event_rsvps ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view event RSVPs" ON public.event_rsvps;
DROP POLICY IF EXISTS "Users can manage their own RSVPs" ON public.event_rsvps;

CREATE POLICY "Anyone can view event RSVPs"
ON public.event_rsvps FOR SELECT
USING (true);

CREATE POLICY "Users can manage their own RSVPs"
ON public.event_rsvps FOR ALL
USING (auth.uid() = user_id);

-- 3. VERIFICATION STATUSES ENUM
-- =====================================================
DO $$ BEGIN
    CREATE TYPE public.verification_status AS ENUM ('unverified', 'pending', 'verified', 'rejected');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 4. ALTER experiences and education to use enum type
DO $$ BEGIN
    ALTER TABLE public.experiences 
    ALTER COLUMN verification_status TYPE public.verification_status 
    USING verification_status::public.verification_status;
EXCEPTION
    WHEN others THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE public.education 
    ALTER COLUMN verification_status TYPE public.verification_status 
    USING verification_status::public.verification_status;
EXCEPTION
    WHEN others THEN null;
END $$;