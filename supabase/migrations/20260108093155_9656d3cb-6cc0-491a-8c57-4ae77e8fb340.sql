-- Create author_follows table for one-way article following
CREATE TABLE public.author_follows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  follower_id UUID NOT NULL,
  author_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(follower_id, author_id),
  CONSTRAINT author_follows_different_users CHECK (follower_id != author_id)
);

-- Enable RLS
ALTER TABLE public.author_follows ENABLE ROW LEVEL SECURITY;

-- Anyone can view follows (for follower counts)
CREATE POLICY "Anyone can view author follows" ON public.author_follows
FOR SELECT USING (true);

-- Users can manage their own follows
CREATE POLICY "Users can follow authors" ON public.author_follows
FOR INSERT WITH CHECK (auth.uid() = follower_id);

CREATE POLICY "Users can unfollow authors" ON public.author_follows
FOR DELETE USING (auth.uid() = follower_id);

-- Create indexes for performance
CREATE INDEX idx_author_follows_follower ON public.author_follows(follower_id);
CREATE INDEX idx_author_follows_author ON public.author_follows(author_id);

-- Function to notify followers when an article is published
CREATE OR REPLACE FUNCTION public.notify_followers_of_article()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only trigger when article becomes published
  IF NEW.published = true AND (OLD IS NULL OR OLD.published = false) THEN
    INSERT INTO notifications (type, recipient_id, actor_id, object_id, object_type, content)
    SELECT 
      'article_published',
      af.follower_id,
      NEW.user_id,
      NEW.id::text,
      'article',
      'published a new article: ' || LEFT(NEW.title, 100)
    FROM author_follows af
    WHERE af.author_id = NEW.user_id;
  END IF;
  RETURN NEW;
END;
$$;

-- Create trigger for article publish notifications
CREATE TRIGGER on_article_publish
  AFTER INSERT OR UPDATE ON public.articles
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_followers_of_article();

-- Enable realtime for author_follows
ALTER PUBLICATION supabase_realtime ADD TABLE public.author_follows;