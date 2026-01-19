-- Add messages table to realtime publication for instant updates
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;

-- Create trigger to notify followers when author publishes article
CREATE OR REPLACE FUNCTION public.notify_followers_of_article()
RETURNS TRIGGER AS $$
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
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public';

-- Create trigger on articles table
DROP TRIGGER IF EXISTS trigger_notify_followers_of_article ON articles;
CREATE TRIGGER trigger_notify_followers_of_article
AFTER INSERT OR UPDATE ON articles
FOR EACH ROW EXECUTE FUNCTION notify_followers_of_article();