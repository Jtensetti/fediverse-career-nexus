-- =====================================================
-- FOUNDATIONAL SCHEMA FOR FEDERATION SYSTEM
-- This creates all core tables, functions, and policies
-- =====================================================

-- 1. ROLE SYSTEM (for admin/moderator access control)
-- =====================================================
CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user');

CREATE TABLE public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role app_role NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Security definer functions for role checks (prevents RLS recursion)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

CREATE OR REPLACE FUNCTION public.is_admin(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_role(_user_id, 'admin')
$$;

CREATE OR REPLACE FUNCTION public.is_moderator(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_role(_user_id, 'admin') OR public.has_role(_user_id, 'moderator')
$$;

-- RLS for user_roles
CREATE POLICY "Users can view their own roles"
ON public.user_roles FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all roles"
ON public.user_roles FOR ALL
USING (public.is_admin(auth.uid()));

-- 2. PROFILES TABLE
-- =====================================================
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    username TEXT UNIQUE,
    fullname TEXT,
    headline TEXT,
    bio TEXT,
    avatar_url TEXT,
    phone TEXT,
    location TEXT,
    domain TEXT,
    is_verified BOOLEAN DEFAULT false,
    profile_views INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view profiles"
ON public.profiles FOR SELECT
USING (true);

CREATE POLICY "Users can update their own profile"
ON public.profiles FOR UPDATE
USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile"
ON public.profiles FOR INSERT
WITH CHECK (auth.uid() = id);

-- Auto-create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, username, created_at, updated_at)
  VALUES (NEW.id, 'user_' || substr(NEW.id::text, 1, 8), now(), now());
  
  -- Also create default user role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'user');
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 3. ACTORS TABLE (ActivityPub actors)
-- =====================================================
CREATE TABLE public.actors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    preferred_username TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT 'Person',
    status TEXT DEFAULT 'active',
    private_key TEXT,
    public_key TEXT,
    follower_count INTEGER DEFAULT 0,
    following_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_actors_user_id ON public.actors(user_id);
CREATE INDEX idx_actors_preferred_username ON public.actors(preferred_username);

ALTER TABLE public.actors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view actors"
ON public.actors FOR SELECT
USING (true);

CREATE POLICY "Users can insert their own actor"
ON public.actors FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own actor"
ON public.actors FOR UPDATE
USING (auth.uid() = user_id);

-- Add foreign key from actors to profiles
ALTER TABLE public.actors 
ADD CONSTRAINT fk_actors_profiles 
FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- 4. AP_OBJECTS TABLE (ActivityPub objects like posts)
-- =====================================================
CREATE TABLE public.ap_objects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type TEXT NOT NULL,
    attributed_to UUID REFERENCES public.actors(id) ON DELETE CASCADE,
    content JSONB,
    published_at TIMESTAMPTZ DEFAULT now(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_ap_objects_attributed_to ON public.ap_objects(attributed_to);
CREATE INDEX idx_ap_objects_type ON public.ap_objects(type);
CREATE INDEX idx_ap_objects_published_at ON public.ap_objects(published_at DESC);

ALTER TABLE public.ap_objects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view public posts"
ON public.ap_objects FOR SELECT
USING (true);

CREATE POLICY "Users can create posts via their actor"
ON public.ap_objects FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.actors 
    WHERE actors.id = ap_objects.attributed_to 
    AND actors.user_id = auth.uid()
  )
);

CREATE POLICY "Users can update their own posts"
ON public.ap_objects FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.actors 
    WHERE actors.id = ap_objects.attributed_to 
    AND actors.user_id = auth.uid()
  )
);

CREATE POLICY "Users can delete their own posts"
ON public.ap_objects FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.actors 
    WHERE actors.id = ap_objects.attributed_to 
    AND actors.user_id = auth.uid()
  )
);

-- 5. SERVER KEYS TABLE (instance-wide keys)
-- =====================================================
CREATE TABLE public.server_keys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    public_key TEXT NOT NULL,
    private_key TEXT NOT NULL,
    is_current BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    revoked_at TIMESTAMPTZ
);

ALTER TABLE public.server_keys ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view public server keys"
ON public.server_keys FOR SELECT
USING (true);

CREATE POLICY "Admins can manage server keys"
ON public.server_keys FOR ALL
USING (public.is_admin(auth.uid()));

-- Function to get current server key
CREATE OR REPLACE FUNCTION public.get_current_server_key()
RETURNS TABLE (public_key TEXT, private_key TEXT)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT public_key, private_key FROM public.server_keys
  WHERE is_current = true AND revoked_at IS NULL
  ORDER BY created_at DESC
  LIMIT 1;
$$;

-- 6. USER SETTINGS TABLE
-- =====================================================
CREATE TABLE public.user_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
    theme TEXT DEFAULT 'system',
    show_network_connections BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own settings"
ON public.user_settings FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own settings"
ON public.user_settings FOR ALL
USING (auth.uid() = user_id);

-- 7. USER CONNECTIONS TABLE
-- =====================================================
CREATE TABLE public.user_connections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    connected_user_id UUID NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(user_id, connected_user_id)
);

CREATE INDEX idx_user_connections_user_id ON public.user_connections(user_id);
CREATE INDEX idx_user_connections_connected_user_id ON public.user_connections(connected_user_id);

ALTER TABLE public.user_connections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own connections"
ON public.user_connections FOR SELECT
USING (auth.uid() = user_id OR auth.uid() = connected_user_id);

CREATE POLICY "Users can create connections"
ON public.user_connections FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their connections"
ON public.user_connections FOR UPDATE
USING (auth.uid() = user_id OR auth.uid() = connected_user_id);

CREATE POLICY "Users can delete their connections"
ON public.user_connections FOR DELETE
USING (auth.uid() = user_id OR auth.uid() = connected_user_id);

-- Add foreign keys after both tables exist
ALTER TABLE public.user_connections 
ADD CONSTRAINT fk_user_connections_user_id 
FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE public.user_connections 
ADD CONSTRAINT fk_user_connections_connected_user_id 
FOREIGN KEY (connected_user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- 8. MODERATION ACTIONS TABLE
-- =====================================================
CREATE TABLE public.moderation_actions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type TEXT NOT NULL,
    target_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    moderator_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    reason TEXT,
    is_public BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_moderation_actions_target ON public.moderation_actions(target_user_id);
CREATE INDEX idx_moderation_actions_moderator ON public.moderation_actions(moderator_id);

ALTER TABLE public.moderation_actions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Moderators can view all moderation actions"
ON public.moderation_actions FOR SELECT
USING (public.is_moderator(auth.uid()) OR is_public = true);

CREATE POLICY "Moderators can create moderation actions"
ON public.moderation_actions FOR INSERT
WITH CHECK (public.is_moderator(auth.uid()));

-- 9. PROFILE VIEWS TABLE
-- =====================================================
CREATE TABLE public.profile_views (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    viewer_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_profile_views_profile ON public.profile_views(profile_id);
CREATE INDEX idx_profile_views_created_at ON public.profile_views(created_at DESC);

ALTER TABLE public.profile_views ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own profile views"
ON public.profile_views FOR SELECT
USING (auth.uid() = profile_id);

CREATE POLICY "Anyone can insert profile views"
ON public.profile_views FOR INSERT
WITH CHECK (true);

-- 10. OUTGOING FOLLOWS TABLE (for federation)
-- =====================================================
CREATE TABLE public.outgoing_follows (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    local_actor_id UUID NOT NULL REFERENCES public.actors(id) ON DELETE CASCADE,
    remote_actor_url TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(local_actor_id, remote_actor_url)
);

CREATE INDEX idx_outgoing_follows_actor ON public.outgoing_follows(local_actor_id);

ALTER TABLE public.outgoing_follows ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own follows"
ON public.outgoing_follows FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.actors 
    WHERE actors.id = outgoing_follows.local_actor_id 
    AND actors.user_id = auth.uid()
  )
);

CREATE POLICY "Users can create follows via their actor"
ON public.outgoing_follows FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.actors 
    WHERE actors.id = outgoing_follows.local_actor_id 
    AND actors.user_id = auth.uid()
  )
);

CREATE POLICY "Users can update their follows"
ON public.outgoing_follows FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.actors 
    WHERE actors.id = outgoing_follows.local_actor_id 
    AND actors.user_id = auth.uid()
  )
);

-- Function to update outgoing follows updated_at
CREATE OR REPLACE FUNCTION public.update_outgoing_follows_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_outgoing_follows_timestamp
  BEFORE UPDATE ON public.outgoing_follows
  FOR EACH ROW EXECUTE FUNCTION public.update_outgoing_follows_updated_at();

-- 11. REMOTE ACTORS CACHE TABLE
-- =====================================================
CREATE TABLE public.remote_actors_cache (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_url TEXT NOT NULL UNIQUE,
    actor_data JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    expires_at TIMESTAMPTZ DEFAULT (now() + interval '1 day')
);

CREATE INDEX idx_remote_actors_cache_url ON public.remote_actors_cache(actor_url);
CREATE INDEX idx_remote_actors_cache_expires ON public.remote_actors_cache(expires_at);

ALTER TABLE public.remote_actors_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view remote actors cache"
ON public.remote_actors_cache FOR SELECT
USING (true);

CREATE POLICY "Service can manage remote actors cache"
ON public.remote_actors_cache FOR ALL
USING (true);

-- Function to cleanup expired cache
CREATE OR REPLACE FUNCTION public.cleanup_expired_actor_cache()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  DELETE FROM public.remote_actors_cache WHERE expires_at < now();
$$;

-- 12. FEDERATION QUEUE (partitioned for sharding)
-- =====================================================
CREATE TABLE public.federation_queue_partitioned (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_id UUID NOT NULL REFERENCES public.actors(id) ON DELETE CASCADE,
    activity JSONB NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    partition_key INTEGER NOT NULL DEFAULT 0,
    attempts INTEGER DEFAULT 0,
    last_error TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    processed_at TIMESTAMPTZ
);

CREATE INDEX idx_federation_queue_status ON public.federation_queue_partitioned(status);
CREATE INDEX idx_federation_queue_partition ON public.federation_queue_partitioned(partition_key);
CREATE INDEX idx_federation_queue_created ON public.federation_queue_partitioned(created_at);

ALTER TABLE public.federation_queue_partitioned ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage federation queue"
ON public.federation_queue_partitioned FOR ALL
USING (public.is_admin(auth.uid()));

-- Function to calculate partition key
CREATE OR REPLACE FUNCTION public.actor_id_to_partition_key(actor_uuid UUID)
RETURNS INTEGER
LANGUAGE sql
IMMUTABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT abs(hashtext(actor_uuid::text)) % 16;
$$;

-- Trigger to set partition key
CREATE OR REPLACE FUNCTION public.set_federation_queue_partition_key()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  NEW.partition_key = public.actor_id_to_partition_key(NEW.actor_id);
  RETURN NEW;
END;
$$;

CREATE TRIGGER set_partition_key
  BEFORE INSERT ON public.federation_queue_partitioned
  FOR EACH ROW EXECUTE FUNCTION public.set_federation_queue_partition_key();

-- 13. FOLLOWER BATCHES TABLE
-- =====================================================
CREATE TABLE public.follower_batches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_id UUID NOT NULL REFERENCES public.actors(id) ON DELETE CASCADE,
    followers JSONB NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    processed_at TIMESTAMPTZ
);

CREATE INDEX idx_follower_batches_actor ON public.follower_batches(actor_id);
CREATE INDEX idx_follower_batches_status ON public.follower_batches(status);

ALTER TABLE public.follower_batches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage follower batches"
ON public.follower_batches FOR ALL
USING (public.is_admin(auth.uid()));

-- Function to get follower batch stats
CREATE OR REPLACE FUNCTION public.get_follower_batch_stats()
RETURNS TABLE (
  total_batches BIGINT,
  pending_batches BIGINT,
  processed_batches BIGINT
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT 
    COUNT(*) as total_batches,
    COUNT(*) FILTER (WHERE status = 'pending') as pending_batches,
    COUNT(*) FILTER (WHERE status = 'processed') as processed_batches
  FROM public.follower_batches;
$$;

-- Function to create follower batches
CREATE OR REPLACE FUNCTION public.create_follower_batches(
  p_actor_id UUID,
  p_followers JSONB,
  p_batch_size INTEGER DEFAULT 50
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  batch_count INTEGER := 0;
  follower_array JSONB[];
  i INTEGER := 0;
  batch JSONB;
BEGIN
  -- Convert JSONB array to PostgreSQL array
  SELECT array_agg(value) INTO follower_array FROM jsonb_array_elements(p_followers);
  
  -- Create batches
  WHILE i < array_length(follower_array, 1) LOOP
    batch := to_jsonb(follower_array[i+1:least(i+p_batch_size, array_length(follower_array, 1))]);
    
    INSERT INTO public.follower_batches (actor_id, followers, status)
    VALUES (p_actor_id, batch, 'pending');
    
    batch_count := batch_count + 1;
    i := i + p_batch_size;
  END LOOP;
  
  RETURN batch_count;
END;
$$;

-- 14. EXPERIENCE TABLE (for profiles)
-- =====================================================
CREATE TABLE public.experiences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    company TEXT NOT NULL,
    is_current_role BOOLEAN DEFAULT false,
    start_date DATE,
    end_date DATE,
    location TEXT,
    description TEXT,
    verification_status TEXT DEFAULT 'unverified',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_experiences_user ON public.experiences(user_id);

ALTER TABLE public.experiences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view experiences"
ON public.experiences FOR SELECT
USING (true);

CREATE POLICY "Users can manage their own experiences"
ON public.experiences FOR ALL
USING (auth.uid() = user_id);

-- 15. EDUCATION TABLE
-- =====================================================
CREATE TABLE public.education (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    institution TEXT NOT NULL,
    degree TEXT NOT NULL,
    field TEXT,
    start_year INTEGER,
    end_year INTEGER,
    verification_status TEXT DEFAULT 'unverified',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_education_user ON public.education(user_id);

ALTER TABLE public.education ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view education"
ON public.education FOR SELECT
USING (true);

CREATE POLICY "Users can manage their own education"
ON public.education FOR ALL
USING (auth.uid() = user_id);

-- 16. SKILLS TABLE
-- =====================================================
CREATE TABLE public.skills (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    endorsements INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_skills_user ON public.skills(user_id);

ALTER TABLE public.skills ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view skills"
ON public.skills FOR SELECT
USING (true);

CREATE POLICY "Users can manage their own skills"
ON public.skills FOR ALL
USING (auth.uid() = user_id);

-- 17. FUNCTION TO ENSURE ACTOR HAS KEYS
-- =====================================================
CREATE OR REPLACE FUNCTION public.ensure_actor_has_keys(actor_uuid UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  has_keys BOOLEAN;
BEGIN
  SELECT (private_key IS NOT NULL AND public_key IS NOT NULL)
  INTO has_keys
  FROM public.actors
  WHERE id = actor_uuid;
  
  RETURN COALESCE(has_keys, false);
END;
$$;

-- 18. FUNCTION TO UPDATE ACTOR FOLLOWER COUNT
-- =====================================================
CREATE OR REPLACE FUNCTION public.update_actor_follower_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  -- This would be called by triggers on follower tables
  RETURN NEW;
END;
$$;

-- 19. GET CONNECTION DEGREE FUNCTION
-- =====================================================
CREATE OR REPLACE FUNCTION public.get_connection_degree(
  source_user_id UUID,
  target_user_id UUID
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Direct connection (1st degree)
  IF EXISTS (
    SELECT 1 FROM public.user_connections
    WHERE (
      (user_id = source_user_id AND connected_user_id = target_user_id)
      OR (user_id = target_user_id AND connected_user_id = source_user_id)
    )
    AND status = 'accepted'
  ) THEN
    RETURN 1;
  END IF;
  
  -- 2nd degree connection
  IF EXISTS (
    SELECT 1 FROM public.user_connections c1
    JOIN public.user_connections c2 ON (
      c1.connected_user_id = c2.user_id 
      OR c1.connected_user_id = c2.connected_user_id
      OR c1.user_id = c2.user_id
      OR c1.user_id = c2.connected_user_id
    )
    WHERE c1.status = 'accepted' AND c2.status = 'accepted'
    AND (c1.user_id = source_user_id OR c1.connected_user_id = source_user_id)
    AND (c2.user_id = target_user_id OR c2.connected_user_id = target_user_id)
  ) THEN
    RETURN 2;
  END IF;
  
  -- Not connected
  RETURN NULL;
END;
$$;

-- 20. FEDERATED FEED VIEW
-- =====================================================
CREATE VIEW public.federated_feed
WITH (security_invoker=true) AS
SELECT 
  ap.id,
  ap.content,
  ap.attributed_to,
  ap.published_at,
  ap.type,
  CASE 
    WHEN p.id IS NOT NULL THEN 'local'
    ELSE 'remote'
  END as source
FROM ap_objects ap
LEFT JOIN profiles p ON ap.attributed_to = p.id
WHERE ap.type = 'Create'
ORDER BY ap.published_at DESC;

-- 21. FEDERATED POSTS WITH MODERATION VIEW
-- =====================================================
CREATE VIEW public.federated_posts_with_moderation
WITH (security_invoker=true) AS
SELECT 
  ap.id,
  ap.content,
  ap.attributed_to,
  ap.published_at,
  ap.type,
  CASE 
    WHEN p.id IS NOT NULL THEN 'local'
    ELSE 'remote'
  END as source,
  'approved' as moderation_status
FROM ap_objects ap
LEFT JOIN profiles p ON ap.attributed_to = p.id
WHERE ap.type = 'Create'
ORDER BY ap.published_at DESC;