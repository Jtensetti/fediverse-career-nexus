-- Phase 1: Critical Authorization Fixes

-- 1.1 Create function to check if users are connected
CREATE OR REPLACE FUNCTION public.are_users_connected(user1 UUID, user2 UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_connections
    WHERE status = 'accepted'
    AND ((user_id = user1 AND connected_user_id = user2)
      OR (user_id = user2 AND connected_user_id = user1))
  );
$$;

-- 1.2 Update messaging RLS - drop old policy and create new one requiring connection
DROP POLICY IF EXISTS "Users can send messages" ON public.messages;

CREATE POLICY "Users can send messages to connections"
ON public.messages
FOR INSERT
WITH CHECK (
  auth.uid() = sender_id 
  AND public.are_users_connected(auth.uid(), recipient_id)
);

-- 1.3 Update handle_new_user trigger to also create user_settings
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Create profile
  INSERT INTO public.profiles (id, username, created_at, updated_at)
  VALUES (NEW.id, 'user_' || substr(NEW.id::text, 1, 8), now(), now());
  
  -- Create default user role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'user');
  
  -- Create default user settings
  INSERT INTO public.user_settings (user_id, theme, show_network_connections)
  VALUES (NEW.id, 'system', true);
  
  RETURN NEW;
END;
$$;

-- 1.4 Create trigger for auto-assigning article author
CREATE OR REPLACE FUNCTION public.handle_new_article()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Auto-insert the creator as primary author
  INSERT INTO public.article_authors (article_id, user_id, is_primary, can_edit)
  VALUES (NEW.id, NEW.user_id, true, true)
  ON CONFLICT DO NOTHING;
  
  RETURN NEW;
END;
$$;

-- Create the trigger
DROP TRIGGER IF EXISTS on_article_created ON public.articles;
CREATE TRIGGER on_article_created
  AFTER INSERT ON public.articles
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_article();

-- 1.5 Backfill: Create user_settings for existing users who don't have them
INSERT INTO public.user_settings (user_id, theme, show_network_connections)
SELECT p.id, 'system', true
FROM public.profiles p
WHERE NOT EXISTS (
  SELECT 1 FROM public.user_settings us WHERE us.user_id = p.id
);

-- 1.6 Backfill: Add missing article authors for existing articles
INSERT INTO public.article_authors (article_id, user_id, is_primary, can_edit)
SELECT a.id, a.user_id, true, true
FROM public.articles a
WHERE NOT EXISTS (
  SELECT 1 FROM public.article_authors aa 
  WHERE aa.article_id = a.id AND aa.user_id = a.user_id
);