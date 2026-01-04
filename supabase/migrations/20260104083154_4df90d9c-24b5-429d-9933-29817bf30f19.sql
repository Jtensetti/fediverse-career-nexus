-- Phase 1: Critical Database Fixes

-- 1.1 Create actor_followers table for storing follower relationships
CREATE TABLE public.actor_followers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  local_actor_id UUID NOT NULL REFERENCES public.actors(id) ON DELETE CASCADE,
  follower_actor_url TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(local_actor_id, follower_actor_url)
);

-- 1.2 Create inbox_items table for storing incoming activities
CREATE TABLE public.inbox_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_id UUID NOT NULL REFERENCES public.actors(id) ON DELETE CASCADE,
  sender TEXT NOT NULL,
  activity_type TEXT NOT NULL,
  object_type TEXT,
  content JSONB NOT NULL,
  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS on new tables
ALTER TABLE public.actor_followers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inbox_items ENABLE ROW LEVEL SECURITY;

-- RLS policies for actor_followers
CREATE POLICY "Anyone can view followers" ON public.actor_followers 
  FOR SELECT USING (true);

CREATE POLICY "Users can manage their actor followers" ON public.actor_followers 
  FOR ALL USING (
    EXISTS (SELECT 1 FROM actors WHERE actors.id = actor_followers.local_actor_id AND actors.user_id = auth.uid())
  );

-- RLS policies for inbox_items  
CREATE POLICY "Users can view their inbox items" ON public.inbox_items 
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM actors WHERE actors.id = inbox_items.recipient_id AND actors.user_id = auth.uid())
  );

CREATE POLICY "Users can manage their inbox items" ON public.inbox_items 
  FOR ALL USING (
    EXISTS (SELECT 1 FROM actors WHERE actors.id = inbox_items.recipient_id AND actors.user_id = auth.uid())
  );

-- 1.3 Add missing RLS policy to auth_request_logs
CREATE POLICY "Admins can manage auth_request_logs" ON public.auth_request_logs 
  FOR ALL USING (is_admin(auth.uid()));

-- 1.4 Create storage bucket for post images
INSERT INTO storage.buckets (id, name, public) 
VALUES ('posts', 'posts', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for posts bucket
CREATE POLICY "Users can upload post images" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'posts' AND auth.uid() IS NOT NULL);
  
CREATE POLICY "Anyone can view post images" ON storage.objects
  FOR SELECT USING (bucket_id = 'posts');

CREATE POLICY "Users can delete their post images" ON storage.objects
  FOR DELETE USING (bucket_id = 'posts' AND auth.uid()::text = (storage.foldername(name))[1]);

-- 1.5 Create NodeInfo database row
INSERT INTO public.ap_objects (type, content) VALUES (
  'NodeInfo',
  '{
    "version": "2.0",
    "software": {
      "name": "bondy",
      "version": "1.0.0"
    },
    "protocols": ["activitypub"],
    "usage": {
      "users": {"total": 0, "activeMonth": 0, "activeHalfyear": 0},
      "localPosts": 0
    },
    "openRegistrations": true,
    "metadata": {}
  }'::jsonb
)
ON CONFLICT DO NOTHING;

-- Add indexes for performance
CREATE INDEX idx_actor_followers_local_actor ON public.actor_followers(local_actor_id);
CREATE INDEX idx_actor_followers_status ON public.actor_followers(status);
CREATE INDEX idx_inbox_items_recipient ON public.inbox_items(recipient_id);
CREATE INDEX idx_inbox_items_activity_type ON public.inbox_items(activity_type);
CREATE INDEX idx_inbox_items_created_at ON public.inbox_items(created_at DESC);

-- Enable realtime for new tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.actor_followers;
ALTER PUBLICATION supabase_realtime ADD TABLE public.inbox_items;