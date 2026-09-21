BEGIN;

-- JWT validity alone does not imply that a session still exists or has passed MFA.
CREATE OR REPLACE FUNCTION public.current_session_is_active()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT (SELECT auth.uid()) IS NOT NULL
    AND EXISTS (SELECT 1 FROM auth.sessions s
      WHERE s.id::text = (SELECT auth.jwt()->>'session_id') AND s.user_id = (SELECT auth.uid())
        AND (s.not_after IS NULL OR s.not_after > now()))
    AND NOT public.is_user_banned((SELECT auth.uid()));
$$;
CREATE OR REPLACE FUNCTION public.current_session_is_verified()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT public.current_session_is_active() AND (
    (SELECT auth.jwt()->>'aal') = 'aal2' OR NOT EXISTS (
      SELECT 1 FROM auth.mfa_factors WHERE user_id = (SELECT auth.uid()) AND status = 'verified'
    ));
$$;
REVOKE ALL ON FUNCTION public.current_session_is_active(), public.current_session_is_verified() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.current_session_is_active(), public.current_session_is_verified() TO authenticated, service_role;

-- Restrictive policies compose with existing ownership policies; they never grant access.
-- Public anonymous reads remain governed by their existing policies. Service jobs bypass RLS.
DO $$
DECLARE t record;
BEGIN
  FOR t IN SELECT n.nspname, c.relname FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE c.relkind IN ('r','p') AND c.relrowsecurity AND NOT c.relispartition
      AND (n.nspname = 'public' OR (n.nspname = 'storage' AND c.relname = 'objects'))
  LOOP
    EXECUTE format('CREATE POLICY "Verified live session" ON %I.%I AS RESTRICTIVE FOR ALL TO authenticated USING ((SELECT public.current_session_is_verified())) WITH CHECK ((SELECT public.current_session_is_verified()))', t.nspname,t.relname);
  END LOOP;
END $$;

-- These tables are exclusively maintained by verified server workflows.
REVOKE ALL ON public.federated_sessions, public.password_reset_codes, public.mfa_recovery_tokens FROM PUBLIC, anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.remote_actors_cache, public.mfa_recovery_requests FROM PUBLIC, anon, authenticated;
DROP POLICY IF EXISTS "Users can create recovery requests" ON public.mfa_recovery_requests;
-- Views must not let a logged-in user skip MFA or read another user's OAuth association.
ALTER VIEW public.federated_sessions_safe SET (security_invoker = true);
GRANT SELECT (id,profile_id,token_expires_at,last_verified_at,created_at,updated_at,remote_instance,remote_actor_url)
  ON public.federated_sessions TO authenticated;
DROP POLICY IF EXISTS "Owners read session metadata" ON public.federated_sessions;
CREATE POLICY "Owners read session metadata" ON public.federated_sessions FOR SELECT TO authenticated USING ((SELECT auth.uid()) = profile_id);

-- Restrict mutable columns, including when ownership is correct.
REVOKE UPDATE ON public.profiles, public.companies, public.notifications, public.messages, public.message_requests FROM PUBLIC, anon, authenticated;
GRANT UPDATE (username,fullname,headline,bio,avatar_url,phone,location,header_url,dm_privacy,is_freelancer,freelancer_skills,freelancer_rate,freelancer_availability,website,contact_email,email_digest_enabled,updated_at)
  ON public.profiles TO authenticated;
-- Profiles are created by the auth trigger, not a client-controlled upsert.
REVOKE INSERT ON public.profiles FROM PUBLIC, anon, authenticated;
GRANT UPDATE (slug,name,tagline,description,logo_url,banner_url,website,industry,size,location,founded_year,is_active,updated_at)
  ON public.companies TO authenticated;
GRANT UPDATE (read) ON public.notifications TO authenticated;
GRANT UPDATE (read_at) ON public.messages TO authenticated;
GRANT UPDATE (status,responded_at) ON public.message_requests TO authenticated;
REVOKE INSERT ON public.messages FROM PUBLIC, anon, authenticated;

DROP POLICY IF EXISTS "Users can create job conversations" ON public.job_conversations;
CREATE POLICY "Applicants start conversations about real active jobs" ON public.job_conversations
  FOR INSERT TO authenticated WITH CHECK (
    applicant_id = (SELECT auth.uid()) AND applicant_id <> poster_id
    AND EXISTS (SELECT 1 FROM public.job_posts j WHERE j.id = job_post_id AND j.user_id = poster_id
      AND j.is_active AND (j.expires_at IS NULL OR j.expires_at > now()))
    AND NOT public.is_user_blocked(applicant_id,poster_id) AND NOT public.is_user_blocked(poster_id,applicant_id)
  );

DROP POLICY IF EXISTS "Anyone can insert profile views" ON public.profile_views;
CREATE POLICY "Signed in viewers record their own visit" ON public.profile_views FOR INSERT TO authenticated
  WITH CHECK (viewer_id = (SELECT auth.uid()) AND profile_id <> viewer_id);
REVOKE INSERT ON public.profile_views FROM anon;

CREATE OR REPLACE FUNCTION public.can_message_user(p_sender_id uuid, p_recipient_id uuid, p_job_post_id uuid DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = '' AS $$
DECLARE privacy text; permitted boolean := false;
BEGIN
  IF (SELECT auth.uid()) IS DISTINCT FROM p_sender_id OR NOT public.current_session_is_verified() THEN
    RETURN jsonb_build_object('can_message',false,'is_federated',false,'reason','not_authenticated');
  END IF;
  IF p_sender_id = p_recipient_id THEN
    RETURN jsonb_build_object('can_message',false,'is_federated',false,'reason','cannot_message_self');
  END IF;
  IF public.is_user_banned(p_recipient_id) OR public.is_user_blocked(p_sender_id,p_recipient_id)
    OR public.is_user_blocked(p_recipient_id,p_sender_id) THEN
    RETURN jsonb_build_object('can_message',false,'is_federated',false,'reason','unavailable');
  END IF;
  IF EXISTS (SELECT 1 FROM public.actors WHERE user_id = p_recipient_id AND is_remote) THEN
    RETURN jsonb_build_object('can_message',false,'is_federated',true,'reason','remote_messages_unsupported');
  END IF;
  SELECT coalesce(dm_privacy,'connections') INTO privacy FROM public.profiles WHERE id = p_recipient_id;
  IF privacy IS NULL OR privacy = 'nobody' THEN
    RETURN jsonb_build_object('can_message',false,'is_federated',false,'reason','unavailable');
  END IF;
  permitted := privacy = 'everyone' OR public.are_users_connected(p_sender_id,p_recipient_id)
    OR (privacy='connections_plus' AND public.get_connection_degree(p_sender_id,p_recipient_id)=2)
    OR EXISTS (SELECT 1 FROM public.message_requests WHERE status = 'accepted'
      AND ((sender_id=p_sender_id AND recipient_id=p_recipient_id) OR (sender_id=p_recipient_id AND recipient_id=p_sender_id)))
    OR EXISTS (SELECT 1 FROM public.job_conversations c JOIN public.job_posts j ON j.id=c.job_post_id AND j.user_id=c.poster_id
      WHERE ((c.applicant_id=p_sender_id AND c.poster_id=p_recipient_id) OR (c.applicant_id=p_recipient_id AND c.poster_id=p_sender_id))
        AND (p_job_post_id IS NULL OR c.job_post_id=p_job_post_id));
  RETURN jsonb_build_object('can_message',permitted,'is_federated',false,'reason',CASE WHEN permitted THEN 'allowed' ELSE 'not_connected' END);
END $$;
REVOKE ALL ON FUNCTION public.can_message_user(uuid,uuid,uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.can_message_user(uuid,uuid,uuid) TO authenticated;

-- Message requests cannot grant permission to their sender without the recipient accepting.
DROP POLICY IF EXISTS "Users can send message requests" ON public.message_requests;
CREATE POLICY "Senders create pending requests" ON public.message_requests FOR INSERT TO authenticated WITH CHECK (
  sender_id=(SELECT auth.uid()) AND sender_id<>recipient_id AND status='pending' AND responded_at IS NULL
  AND NOT public.is_user_blocked(sender_id,recipient_id) AND NOT public.is_user_blocked(recipient_id,sender_id)
  AND NOT public.is_user_banned(recipient_id)
);

-- A public feed view must not bypass an object's audience.
DROP POLICY IF EXISTS "Public objects" ON public.ap_objects;
DO $$
DECLARE p record;
BEGIN
  FOR p IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename='ap_objects' AND cmd='SELECT'
  LOOP EXECUTE format('DROP POLICY %I ON public.ap_objects',p.policyname); END LOOP;
END $$;
CREATE POLICY "Authors and public audiences can read objects" ON public.ap_objects FOR SELECT TO anon,authenticated USING (
  EXISTS (SELECT 1 FROM public.actors a WHERE a.id=attributed_to AND a.user_id=(SELECT auth.uid()))
  OR ((CASE WHEN type='Create' THEN content->'object' ELSE content END)->'to' ? 'https://www.w3.org/ns/activitystreams#Public')
  OR ((CASE WHEN type='Create' THEN content->'object' ELSE content END)->'cc' ? 'https://www.w3.org/ns/activitystreams#Public')
);
ALTER VIEW public.federated_feed SET (security_invoker=true);
ALTER VIEW public.federated_posts_with_moderation SET (security_invoker=true);

-- No private message text is copied into notifications or email digests.
CREATE OR REPLACE FUNCTION public.notify_private_message()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  INSERT INTO public.notifications (type,recipient_id,actor_id,content,object_id,object_type)
  VALUES ('message',NEW.recipient_id,NEW.sender_id,'Du har ett nytt meddelande',NEW.id::text,'message');
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.notify_private_message() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER notify_private_message AFTER INSERT ON public.messages FOR EACH ROW EXECUTE FUNCTION public.notify_private_message();

-- Internal mutators and trigger functions are not public RPCs.
DO $$
DECLARE routine record;
BEGIN
  FOR routine IN SELECT p.oid::regprocedure AS signature FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
    WHERE n.nspname='public' AND (p.prorettype='trigger'::regtype OR p.proname IN (
      'cleanup_expired_reset_codes','cleanup_expired_actor_cache','cleanup_federation_signature_cache',
      'update_instance_health','update_cache_on_access','check_host_rate_limit','create_federation_alert',
      'get_federation_health','get_federation_queue_stats','get_rate_limited_hosts','get_follower_batch_stats',
      'ensure_actor_has_keys','get_actor_private_key','get_actor_private_key_service','create_follower_batches','claim_federation_items'
    ))
  LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC,anon,authenticated',routine.signature);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO service_role',routine.signature);
  END LOOP;
END $$;

CREATE INDEX IF NOT EXISTS messages_conversation_recent_idx ON public.messages (sender_id,recipient_id,created_at DESC,id DESC);
CREATE INDEX IF NOT EXISTS job_conversations_poster_applicant_idx ON public.job_conversations (poster_id,applicant_id);
CREATE INDEX IF NOT EXISTS user_blocks_pair_idx ON public.user_blocks (blocker_id,blocked_user_id);


CREATE OR REPLACE FUNCTION public.list_own_storage_objects()
RETURNS TABLE(id uuid,bucket_id text,name text,size_bytes text,created_at timestamptz)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT o.id,o.bucket_id,o.name,o.metadata->>'size',o.created_at FROM storage.objects o
  WHERE public.current_session_is_verified() AND (o.owner_id=(SELECT auth.uid())::text OR o.owner=(SELECT auth.uid()));
$$;
REVOKE ALL ON FUNCTION public.list_own_storage_objects() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.list_own_storage_objects() TO authenticated;

-- The old installation registered the same publication notifier twice.
DROP TRIGGER IF EXISTS trigger_notify_followers_of_article ON public.articles;
CREATE OR REPLACE FUNCTION public.create_mutual_connection_follows(user_a uuid, user_b uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF (SELECT auth.uid()) IS NULL OR (SELECT auth.uid()) NOT IN (user_a,user_b) OR NOT public.current_session_is_verified() THEN RAISE EXCEPTION 'Access denied' USING ERRCODE='42501'; END IF;
  -- Verify caller is one of the users
  IF auth.uid() NOT IN (user_a, user_b) THEN
    RAISE EXCEPTION 'Unauthorized: caller must be one of the users';
  END IF;

  -- Verify an accepted connection exists between the users
  IF NOT EXISTS (
    SELECT 1 FROM user_connections
    WHERE status = 'accepted'
    AND (
      (user_id = user_a AND connected_user_id = user_b) OR
      (user_id = user_b AND connected_user_id = user_a)
    )
  ) THEN
    RAISE EXCEPTION 'No accepted connection found between users';
  END IF;

  -- Create mutual follows with source='connection'
  INSERT INTO author_follows (follower_id, author_id, source)
  VALUES
    (user_a, user_b, 'connection'),
    (user_b, user_a, 'connection')
  ON CONFLICT (follower_id, author_id) DO NOTHING;

  RETURN TRUE;
END;
$function$
;
REVOKE ALL ON FUNCTION create_mutual_connection_follows(uuid,uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION create_mutual_connection_follows(uuid,uuid) TO authenticated;
CREATE OR REPLACE FUNCTION public.get_smart_suggestions(p_user_id uuid, p_limit integer DEFAULT 10)
 RETURNS TABLE(user_id uuid, username text, fullname text, headline text, avatar_url text, is_verified boolean, mutual_count bigint, suggestion_reason text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF (SELECT auth.uid()) IS DISTINCT FROM p_user_id OR NOT public.current_session_is_verified() THEN RAISE EXCEPTION 'Access denied' USING ERRCODE='42501'; END IF;
  RETURN QUERY
  WITH
  -- Get the current user's direct connections
  my_connections AS (
    SELECT
      CASE WHEN uc.user_id = p_user_id THEN uc.connected_user_id ELSE uc.user_id END as connected_id
    FROM user_connections uc
    WHERE (uc.user_id = p_user_id OR uc.connected_user_id = p_user_id)
    AND uc.status IN ('accepted', 'pending')
  ),
  -- Get current user's location
  my_location AS (
    SELECT location FROM profiles WHERE id = p_user_id
  ),
  -- Find 2nd degree connections (friends of friends)
  second_degree AS (
    SELECT
      CASE WHEN uc.user_id = mc.connected_id THEN uc.connected_user_id ELSE uc.user_id END as potential_id,
      COUNT(*) as mutual
    FROM user_connections uc
    JOIN my_connections mc ON (uc.user_id = mc.connected_id OR uc.connected_user_id = mc.connected_id)
    WHERE uc.status = 'accepted'
    AND public.can_view_connection_list(uc.user_id)
    AND public.can_view_connection_list(uc.connected_user_id)
    AND CASE WHEN uc.user_id = mc.connected_id THEN uc.connected_user_id ELSE uc.user_id END != p_user_id
    AND CASE WHEN uc.user_id = mc.connected_id THEN uc.connected_user_id ELSE uc.user_id END NOT IN (SELECT connected_id FROM my_connections)
    GROUP BY potential_id
  ),
  -- Combine suggestions with priority scoring
  suggestions AS (
    SELECT
      p.id,
      p.username,
      p.fullname,
      p.headline,
      p.avatar_url,
      p.is_verified,
      COALESCE(sd.mutual, 0) as mutual_count,
      CASE
        WHEN sd.mutual IS NOT NULL AND sd.mutual > 0 THEN
          sd.mutual::text || ' mutual connection' || CASE WHEN sd.mutual > 1 THEN 's' ELSE '' END
        WHEN p.location IS NOT NULL AND ml.location IS NOT NULL AND p.location ILIKE '%' || split_part(ml.location, ',', 1) || '%' THEN
          'Also in ' || split_part(p.location, ',', 1)
        ELSE
          'Suggested for you'
      END as reason,
      -- Priority score: mutual connections weight most, then location match
      CASE
        WHEN sd.mutual IS NOT NULL THEN 100 + sd.mutual
        WHEN p.location IS NOT NULL AND ml.location IS NOT NULL AND p.location ILIKE '%' || split_part(ml.location, ',', 1) || '%' THEN 50
        ELSE 1
      END as priority
    FROM profiles p
    LEFT JOIN second_degree sd ON p.id = sd.potential_id
    CROSS JOIN my_location ml
    WHERE p.id != p_user_id
    AND p.id NOT IN (SELECT connected_id FROM my_connections)
    AND p.username IS NOT NULL
  )
  SELECT
    s.id,
    s.username,
    s.fullname,
    s.headline,
    s.avatar_url,
    s.is_verified,
    s.mutual_count,
    s.reason
  FROM suggestions s
  ORDER BY s.priority DESC, s.mutual_count DESC, s.is_verified DESC NULLS LAST
  LIMIT greatest(1,least(coalesce(p_limit,12),50));
END;
$function$
;
REVOKE ALL ON FUNCTION get_smart_suggestions(uuid,integer) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION get_smart_suggestions(uuid,integer) TO authenticated;
CREATE OR REPLACE FUNCTION public.get_onboarding_recommendations(p_user_id uuid, p_headline text DEFAULT ''::text, p_role text DEFAULT ''::text, p_interests text[] DEFAULT '{}'::text[], p_limit integer DEFAULT 12)
 RETURNS TABLE(user_id uuid, username text, fullname text, headline text, avatar_url text, match_score integer, match_reason text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF (SELECT auth.uid()) IS DISTINCT FROM p_user_id OR NOT public.current_session_is_verified() THEN RAISE EXCEPTION 'Access denied' USING ERRCODE='42501'; END IF;
  RETURN QUERY
  SELECT DISTINCT ON (p.id)
    p.id as user_id,
    p.username,
    p.fullname,
    p.headline,
    p.avatar_url,
    (
      CASE WHEN p.headline ILIKE '%' || p_role || '%' THEN 10 ELSE 0 END +
      CASE WHEN array_length(p_interests, 1) > 0 AND p.headline ILIKE ANY(
        ARRAY(SELECT '%' || unnest || '%' FROM unnest(p_interests))
      ) THEN 5 ELSE 0 END
    )::INT as match_score,
    CASE
      WHEN p.headline ILIKE '%' || p_role || '%' THEN 'Works in similar role'
      ELSE 'Recommended for you'
    END as match_reason
  FROM profiles p
  WHERE p.id != p_user_id
    AND p.fullname IS NOT NULL
    AND (
      p.headline ILIKE '%' || p_role || '%'
      OR (array_length(p_interests, 1) > 0 AND p.headline ILIKE ANY(
        ARRAY(SELECT '%' || unnest || '%' FROM unnest(p_interests))
      ))
      OR (p_headline IS NOT NULL AND p_headline != '' AND p.headline ILIKE '%' || p_headline || '%')
    )
  ORDER BY p.id,
    CASE WHEN p.headline ILIKE '%' || p_role || '%' THEN 10 ELSE 0 END DESC
  LIMIT greatest(1,least(coalesce(p_limit,12),50));
END;
$function$
;
REVOKE ALL ON FUNCTION get_onboarding_recommendations(uuid,text,text,text[],integer) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION get_onboarding_recommendations(uuid,text,text,text[],integer) TO authenticated;
CREATE OR REPLACE FUNCTION public.get_federation_health()
 RETURNS TABLE(total_pending bigint, total_processing bigint, total_failed bigint, oldest_pending_age_minutes double precision, avg_processing_time_ms double precision)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF (SELECT auth.role()) IS DISTINCT FROM 'service_role' AND (NOT public.current_session_is_verified() OR NOT public.is_admin((SELECT auth.uid()))) THEN RAISE EXCEPTION 'Administrator access required' USING ERRCODE='42501'; END IF;
  RETURN QUERY
  SELECT
    COUNT(*) FILTER (WHERE status = 'pending') as total_pending,
    COUNT(*) FILTER (WHERE status = 'processing') as total_processing,
    COUNT(*) FILTER (WHERE status = 'failed') as total_failed,
    (EXTRACT(EPOCH FROM (now() - MIN(created_at) FILTER (WHERE status = 'pending'))) / 60)::double precision as oldest_pending_age_minutes,
    0.0::DOUBLE PRECISION as avg_processing_time_ms
  FROM public.federation_queue_partitioned;
END;
$function$
;
GRANT EXECUTE ON FUNCTION public.get_federation_health() TO authenticated;


CREATE OR REPLACE FUNCTION public.check_account_deletion()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  IF NOT public.current_session_is_verified() THEN RAISE EXCEPTION 'Verified session required' USING ERRCODE='42501'; END IF;
  IF EXISTS (SELECT 1 FROM public.company_roles own WHERE own.user_id=(SELECT auth.uid()) AND own.role='owner'
    AND NOT EXISTS (SELECT 1 FROM public.company_roles other WHERE other.company_id=own.company_id AND other.role='owner' AND other.user_id<>own.user_id)) THEN
    RAISE EXCEPTION 'Transfer organisation ownership before deleting your account';
  END IF;
  IF EXISTS (SELECT 1 FROM storage.objects o WHERE (o.owner_id=(SELECT auth.uid())::text OR o.owner=(SELECT auth.uid()))
    AND (o.bucket_id='company-assets' OR o.name LIKE 'company-posts/%')) THEN
    RAISE EXCEPTION 'Transfer organisation file ownership before deleting your account';
  END IF;
END $$;
REVOKE ALL ON FUNCTION public.check_account_deletion() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.check_account_deletion() TO authenticated;

CREATE OR REPLACE FUNCTION public.erase_account_records()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  -- Do not orphan an organisation if deletion is requested through another admin API.
  IF EXISTS (SELECT 1 FROM public.company_roles own WHERE own.user_id=OLD.id AND own.role='owner'
    AND NOT EXISTS (SELECT 1 FROM public.company_roles other WHERE other.company_id=own.company_id AND other.role='owner' AND other.user_id<>own.user_id)) THEN
    RAISE EXCEPTION 'Transfer organisation ownership before deleting this account';
  END IF;
  DELETE FROM public.company_roles WHERE user_id=OLD.id;
  DELETE FROM public.company_employees WHERE user_id=OLD.id;
  DELETE FROM public.company_followers WHERE user_id=OLD.id;
  DELETE FROM public.company_claim_requests WHERE requester_user_id=OLD.id;
  DELETE FROM public.company_audit_log WHERE actor_user_id=OLD.id;
  DELETE FROM public.reactions WHERE user_id=OLD.id;
  DELETE FROM public.poll_votes WHERE user_id=OLD.id;
  DELETE FROM public.profile_section_visibility WHERE user_id=OLD.id;
  DELETE FROM public.mfa_recovery_requests WHERE user_id=OLD.id OR email=OLD.email OR attempted_login_email=OLD.email;
  DELETE FROM public.newsletter_subscribers WHERE email=OLD.email;
  DELETE FROM public.password_reset_codes WHERE email=OLD.email;
  -- Explicit deletion while the actor still exists lets the tombstone trigger record object IDs.
  DELETE FROM public.ap_objects WHERE attributed_to IN (SELECT id FROM public.actors WHERE user_id=OLD.id);
  RETURN OLD;
END $$;
REVOKE ALL ON FUNCTION public.erase_account_records() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER erase_account_records BEFORE DELETE ON auth.users FOR EACH ROW EXECUTE FUNCTION public.erase_account_records();


-- Apply profile visibility before data leaves PostgreSQL, including the public CV views.
CREATE OR REPLACE FUNCTION public.can_view_profile_section(owner_id uuid, section_name text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT owner_id IS NOT NULL AND (
    (owner_id=(SELECT auth.uid()) AND public.current_session_is_verified())
    OR coalesce((SELECT visibility::text FROM public.profile_section_visibility WHERE user_id=owner_id AND section=section_name),'everyone')='everyone'
    OR (public.current_session_is_verified() AND (
      coalesce((SELECT visibility::text FROM public.profile_section_visibility WHERE user_id=owner_id AND section=section_name),'everyone')='logged_in'
      OR (coalesce((SELECT visibility::text FROM public.profile_section_visibility WHERE user_id=owner_id AND section=section_name),'everyone')='connections'
        AND public.are_users_connected((SELECT auth.uid()),owner_id))
    ))
  );
$$;
REVOKE ALL ON FUNCTION public.can_view_profile_section(uuid,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.can_view_profile_section(uuid,text) TO anon,authenticated,service_role;
CREATE OR REPLACE VIEW public.public_education AS
  SELECT id,user_id,institution,degree,field,start_year,end_year,verification_status,created_at,updated_at
  FROM public.education WHERE public.can_view_profile_section(user_id,'education');
CREATE OR REPLACE VIEW public.public_experiences AS
  SELECT id,user_id,title,company,is_current_role,start_date,end_date,location,description,verification_status,company_domain,created_at,updated_at
  FROM public.experiences WHERE public.can_view_profile_section(user_id,'experience');
DROP POLICY IF EXISTS "Connected users can view skills" ON public.skills;
CREATE POLICY "Profile skill visibility" ON public.skills FOR SELECT TO anon,authenticated
  USING (public.can_view_profile_section(user_id,'skills'));

-- Users can edit qualifications, but cannot certify their own claims.
REVOKE INSERT,UPDATE ON public.experiences,public.education,public.skills FROM PUBLIC,anon,authenticated;
GRANT INSERT (user_id,title,company,is_current_role,start_date,end_date,location,description,company_domain),
  UPDATE (title,company,is_current_role,start_date,end_date,location,description,company_domain)
  ON public.experiences TO authenticated;
GRANT INSERT (user_id,institution,degree,field,start_year,end_year),
  UPDATE (institution,degree,field,start_year,end_year) ON public.education TO authenticated;
GRANT INSERT (user_id,name),UPDATE(name) ON public.skills TO authenticated;

REVOKE UPDATE ON public.recommendations,public.user_connections,public.company_roles FROM PUBLIC,anon,authenticated;
GRANT UPDATE (status,updated_at) ON public.recommendations,public.user_connections TO authenticated;
GRANT UPDATE (role) ON public.company_roles TO authenticated;
CREATE POLICY "Participants can read all connection states" ON public.user_connections FOR SELECT TO authenticated
  USING ((SELECT auth.uid()) IN (user_id,connected_user_id));

CREATE OR REPLACE FUNCTION public.protect_last_company_owner()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  IF OLD.role='owner' AND (TG_OP='DELETE' OR NEW.role<>'owner') THEN
    -- Serialize role changes within a company, including concurrent demotions.
    PERFORM id FROM public.companies WHERE id=OLD.company_id FOR UPDATE;
    IF FOUND AND NOT EXISTS (SELECT 1 FROM public.company_roles WHERE company_id=OLD.company_id AND role='owner' AND id<>OLD.id) THEN
      RAISE EXCEPTION 'The organisation must retain an owner';
    END IF;
  END IF;
  IF TG_OP='DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.protect_last_company_owner() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER protect_last_company_owner BEFORE UPDATE OR DELETE ON public.company_roles FOR EACH ROW EXECUTE FUNCTION public.protect_last_company_owner();


CREATE OR REPLACE FUNCTION public.are_users_connected(user1 uuid,user2 uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT ((SELECT auth.role())='service_role' OR (public.current_session_is_verified() AND (SELECT auth.uid()) IN (user1,user2)))
    AND EXISTS (SELECT 1 FROM public.user_connections WHERE status='accepted'
      AND ((user_id=user1 AND connected_user_id=user2) OR (user_id=user2 AND connected_user_id=user1)));
$$;
CREATE OR REPLACE FUNCTION public.are_users_connected_secure(user1 uuid,user2 uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT public.are_users_connected(user1,user2);
$$;
CREATE OR REPLACE FUNCTION public.can_view_connection_list(owner_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT (owner_id=(SELECT auth.uid()) AND public.current_session_is_verified()) OR
    (public.can_view_profile_section(owner_id,'connections')
      AND coalesce((SELECT show_network_connections FROM public.user_settings WHERE user_id=owner_id),true));
$$;
REVOKE ALL ON FUNCTION public.can_view_connection_list(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.can_view_connection_list(uuid) TO anon,authenticated,service_role;
DROP POLICY IF EXISTS "Anyone can view accepted connections" ON public.user_connections;
CREATE POLICY "Respect both participants connection visibility" ON public.user_connections FOR SELECT TO anon,authenticated
  USING (status='accepted' AND public.can_view_connection_list(user_id) AND public.can_view_connection_list(connected_user_id));


-- A requester must not approve their own connection or recommendation.
DROP POLICY IF EXISTS "Users can create connections" ON public.user_connections;
DROP POLICY IF EXISTS "Users can update their connections" ON public.user_connections;
CREATE POLICY "Send a pending connection request" ON public.user_connections FOR INSERT TO authenticated
  WITH CHECK (user_id=(SELECT auth.uid()) AND user_id<>connected_user_id AND status='pending'
    AND NOT public.is_user_blocked(user_id,connected_user_id) AND NOT public.is_user_blocked(connected_user_id,user_id));
CREATE POLICY "Recipient responds to a pending connection" ON public.user_connections FOR UPDATE TO authenticated
  USING (connected_user_id=(SELECT auth.uid()) AND status='pending')
  WITH CHECK (connected_user_id=(SELECT auth.uid()) AND status IN ('accepted','rejected'));
DROP POLICY IF EXISTS "Users can create recommendations" ON public.recommendations;
CREATE POLICY "Recommendations require recipient approval" ON public.recommendations FOR INSERT TO authenticated
  WITH CHECK (recommender_id=(SELECT auth.uid()) AND status='pending');
DROP POLICY IF EXISTS "User claim employment" ON public.company_employees;
CREATE POLICY "Employment claims start unverified" ON public.company_employees FOR INSERT TO authenticated
  WITH CHECK (user_id=(SELECT auth.uid()) AND is_verified=false AND verified_by IS NULL AND verified_at IS NULL);

CREATE POLICY "Company association on job creation" ON public.job_posts AS RESTRICTIVE FOR INSERT TO authenticated
  WITH CHECK (company_id IS NULL OR public.has_company_role((SELECT auth.uid()),company_id,ARRAY['owner','admin','editor']::public.company_role[]));
CREATE POLICY "Company association on job edits" ON public.job_posts AS RESTRICTIVE FOR UPDATE TO authenticated
  USING (true) WITH CHECK (company_id IS NULL OR public.has_company_role((SELECT auth.uid()),company_id,ARRAY['owner','admin','editor']::public.company_role[]));
CREATE POLICY "Own attribution and authorised company on new posts" ON public.ap_objects AS RESTRICTIVE FOR INSERT TO authenticated
  WITH CHECK (
    (attributed_to IS NULL OR EXISTS (SELECT 1 FROM public.actors WHERE id=attributed_to AND user_id=(SELECT auth.uid()) AND NOT is_remote))
    AND (company_id IS NULL OR public.has_company_role((SELECT auth.uid()),company_id,ARRAY['owner','admin','editor']::public.company_role[]))
  );
CREATE POLICY "Own attribution and authorised company on edits" ON public.ap_objects AS RESTRICTIVE FOR UPDATE TO authenticated
  USING (true) WITH CHECK (
    (attributed_to IS NULL OR EXISTS (SELECT 1 FROM public.actors WHERE id=attributed_to AND user_id=(SELECT auth.uid()) AND NOT is_remote))
    AND (company_id IS NULL OR public.has_company_role((SELECT auth.uid()),company_id,ARRAY['owner','admin','editor']::public.company_role[]))
  );

CREATE OR REPLACE FUNCTION public.notify_account_relation()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE recipient uuid; actor uuid; kind text; object_kind text; object_id text;
BEGIN
  IF TG_TABLE_NAME='user_connections' THEN
    object_kind:='connection'; object_id:=NEW.id::text;
    IF TG_OP='INSERT' AND NEW.status='pending' THEN
      recipient:=NEW.connected_user_id; actor:=NEW.user_id; kind:='connection_request';
    ELSIF TG_OP='UPDATE' AND NEW.status='accepted' AND OLD.status='pending' THEN
      recipient:=NEW.user_id; actor:=NEW.connected_user_id; kind:='connection_accepted';
    END IF;
  ELSIF TG_TABLE_NAME='author_follows' THEN
    recipient:=NEW.author_id; actor:=NEW.follower_id; kind:='follow'; object_kind:='profile'; object_id:=NEW.follower_id::text;
  ELSIF TG_TABLE_NAME='recommendations' THEN
    recipient:=NEW.recipient_id; actor:=NEW.recommender_id; kind:='recommendation_received'; object_kind:='profile'; object_id:=NEW.recipient_id::text;
  ELSIF TG_TABLE_NAME='skill_endorsements' THEN
    SELECT user_id INTO recipient FROM public.skills WHERE id=NEW.skill_id;
    actor:=NEW.endorser_id; kind:='endorsement'; object_kind:='profile'; object_id:=recipient::text;
  END IF;
  IF recipient IS NOT NULL AND recipient IS DISTINCT FROM actor THEN
    INSERT INTO public.notifications(type,recipient_id,actor_id,object_type,object_id) VALUES(kind,recipient,actor,object_kind,object_id);
  END IF;
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.notify_account_relation() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER notify_connection_change AFTER INSERT OR UPDATE ON public.user_connections FOR EACH ROW EXECUTE FUNCTION public.notify_account_relation();
CREATE TRIGGER notify_author_follow AFTER INSERT ON public.author_follows FOR EACH ROW EXECUTE FUNCTION public.notify_account_relation();
CREATE TRIGGER notify_recommendation AFTER INSERT ON public.recommendations FOR EACH ROW EXECUTE FUNCTION public.notify_account_relation();
CREATE TRIGGER notify_endorsement AFTER INSERT ON public.skill_endorsements FOR EACH ROW EXECUTE FUNCTION public.notify_account_relation();


-- Retired local addresses cannot be claimed by a different person later.
CREATE TABLE public.retired_usernames(username text PRIMARY KEY,retired_at timestamptz NOT NULL DEFAULT now());
ALTER TABLE public.retired_usernames ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.retired_usernames FROM PUBLIC,anon,authenticated;
GRANT ALL ON public.retired_usernames TO service_role;
CREATE OR REPLACE FUNCTION public.reserve_deleted_username()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  IF OLD.username IS NOT NULL THEN INSERT INTO public.retired_usernames(username) VALUES(lower(OLD.username)) ON CONFLICT DO NOTHING; END IF;
  RETURN OLD;
END $$;
CREATE TRIGGER reserve_deleted_username BEFORE DELETE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.reserve_deleted_username();
CREATE OR REPLACE FUNCTION public.reject_retired_username()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.retired_usernames WHERE username=lower(NEW.username)) THEN
    RAISE EXCEPTION 'This address is reserved after an account deletion' USING ERRCODE='23505';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER reject_retired_username BEFORE INSERT OR UPDATE OF username ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.reject_retired_username();
REVOKE ALL ON FUNCTION public.reserve_deleted_username(),public.reject_retired_username() FROM PUBLIC,anon,authenticated;
CREATE OR REPLACE FUNCTION public.is_username_available(candidate text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT candidate ~ '^[a-z0-9_]{3,30}$' AND candidate NOT IN ('admin','administrator','support','security','nolto','root','system','moderator')
    AND NOT EXISTS (SELECT 1 FROM public.retired_usernames WHERE username=candidate)
    AND NOT EXISTS (SELECT 1 FROM public.profiles WHERE lower(username)=candidate AND id IS DISTINCT FROM (SELECT auth.uid()));
$$;
REVOKE ALL ON FUNCTION public.is_username_available(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_username_available(text) TO anon,authenticated,service_role;

CREATE OR REPLACE FUNCTION public.request_recommendation(recipient uuid)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE caller uuid := (SELECT auth.uid());
BEGIN
  IF NOT public.current_session_is_verified() OR caller=recipient OR NOT public.are_users_connected(caller,recipient)
    OR public.is_user_blocked(caller,recipient) OR public.is_user_blocked(recipient,caller) THEN
    RAISE EXCEPTION 'An accepted connection is required' USING ERRCODE='42501';
  END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended(caller::text || recipient::text,17));
  IF NOT EXISTS (SELECT 1 FROM public.notifications WHERE type='recommendation_request' AND actor_id=caller AND recipient_id=recipient AND created_at>now()-interval '7 days') THEN
    INSERT INTO public.notifications(type,recipient_id,actor_id,object_type,object_id)
      VALUES ('recommendation_request',recipient,caller,'profile',caller::text);
  END IF;
  RETURN true;
END $$;
REVOKE ALL ON FUNCTION public.request_recommendation(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.request_recommendation(uuid) TO authenticated;


-- Connection degrees must not expose another account's hidden social graph.
CREATE OR REPLACE FUNCTION public.get_connection_degree(source_user_id uuid,target_user_id uuid)
RETURNS integer LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public,pg_temp AS $$
BEGIN
  IF source_user_id IS DISTINCT FROM (SELECT auth.uid()) OR NOT public.current_session_is_verified() THEN
    RAISE EXCEPTION 'Only your own connection degree is available' USING ERRCODE='42501';
  END IF;
  IF public.are_users_connected(source_user_id,target_user_id) THEN RETURN 1; END IF;
  IF NOT public.can_view_connection_list(target_user_id) THEN RETURN NULL; END IF;
  IF EXISTS (
    SELECT 1 FROM public.user_connections first_edge JOIN public.user_connections second_edge
      ON (CASE WHEN first_edge.user_id=source_user_id THEN first_edge.connected_user_id ELSE first_edge.user_id END)
      IN (second_edge.user_id,second_edge.connected_user_id)
    WHERE source_user_id IN (first_edge.user_id,first_edge.connected_user_id)
      AND target_user_id IN (second_edge.user_id,second_edge.connected_user_id)
      AND first_edge.status='accepted' AND second_edge.status='accepted'
      AND public.can_view_connection_list(second_edge.user_id)
      AND public.can_view_connection_list(second_edge.connected_user_id)
  ) THEN RETURN 2; END IF;
  RETURN NULL;
END $$;
REVOKE ALL ON FUNCTION public.get_connection_degree(uuid,uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.get_connection_degree(uuid,uuid) TO authenticated;

-- Creating the company, ownership and audit row is one transaction.
CREATE OR REPLACE FUNCTION public.create_owned_company(payload jsonb)
RETURNS public.companies LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE result public.companies; company_slug text:=lower(trim(payload->>'slug')); company_name text:=trim(payload->>'name'); field text;
BEGIN
  IF NOT public.current_session_is_verified() THEN RAISE EXCEPTION 'Verified session required' USING ERRCODE='42501'; END IF;
  IF jsonb_typeof(payload) IS DISTINCT FROM 'object'
    OR payload - ARRAY['slug','name','tagline','description','logo_url','banner_url','website','industry','size','location','founded_year'] <> '{}'::jsonb
    OR company_slug IS NULL OR company_slug !~ '^[a-z0-9][a-z0-9-]{1,78}[a-z0-9]$'
    OR company_name IS NULL OR length(company_name) NOT BETWEEN 1 AND 120
    OR public.is_slug_reserved(company_slug) THEN
    RAISE EXCEPTION 'Invalid company name, URL or fields' USING ERRCODE='22023';
  END IF;
  FOREACH field IN ARRAY ARRAY['tagline','industry','location'] LOOP
    IF length(payload->>field)>240 THEN RAISE EXCEPTION 'Company field too long' USING ERRCODE='22023'; END IF;
  END LOOP;
  IF length(payload->>'description')>10000 THEN RAISE EXCEPTION 'Description too long' USING ERRCODE='22023'; END IF;
  FOREACH field IN ARRAY ARRAY['logo_url','banner_url','website'] LOOP
    IF coalesce(payload->>field,'')<>'' AND (length(payload->>field)>2048 OR payload->>field !~ '^https://[^[:space:]]+$') THEN
      RAISE EXCEPTION 'Company links must use HTTPS' USING ERRCODE='22023';
    END IF;
  END LOOP;
  IF nullif(payload->>'founded_year','') IS NOT NULL AND
    (payload->>'founded_year' !~ '^[0-9]{4}$' OR (payload->>'founded_year')::integer NOT BETWEEN 1000 AND extract(year FROM now())::integer) THEN
    RAISE EXCEPTION 'Invalid founding year' USING ERRCODE='22023';
  END IF;
  INSERT INTO public.companies(slug,name,tagline,description,logo_url,banner_url,website,industry,size,location,founded_year,claim_status,is_active)
    VALUES(company_slug,company_name,nullif(payload->>'tagline',''),nullif(payload->>'description',''),nullif(payload->>'logo_url',''),
      nullif(payload->>'banner_url',''),nullif(payload->>'website',''),nullif(payload->>'industry',''),nullif(payload->>'size','')::public.company_size,
      nullif(payload->>'location',''),nullif(payload->>'founded_year','')::integer,'claimed',true) RETURNING * INTO result;
  INSERT INTO public.company_roles(company_id,user_id,role) VALUES(result.id,(SELECT auth.uid()),'owner');
  INSERT INTO public.company_audit_log(company_id,actor_user_id,action,metadata)
    VALUES(result.id,(SELECT auth.uid()),'company_created',jsonb_build_object('slug',company_slug,'name',company_name));
  RETURN result;
END $$;
REVOKE ALL ON FUNCTION public.create_owned_company(jsonb) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.create_owned_company(jsonb) TO authenticated;


-- Role assignments must name real accounts; old rows can be inspected before validation.
ALTER TABLE public.company_roles ADD CONSTRAINT company_roles_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE NOT VALID;

REVOKE UPDATE ON public.company_employees FROM PUBLIC,anon,authenticated;
GRANT UPDATE (title,employment_type,start_date,end_date,is_verified,verified_at,verified_by,updated_at)
  ON public.company_employees TO authenticated;
CREATE OR REPLACE FUNCTION public.protect_employment_verification()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  IF (NEW.is_verified,NEW.verified_at,NEW.verified_by) IS DISTINCT FROM (OLD.is_verified,OLD.verified_at,OLD.verified_by)
    AND (SELECT auth.role()) IS DISTINCT FROM 'service_role' THEN
    IF NOT public.current_session_is_verified() OR NOT public.has_company_role((SELECT auth.uid()),OLD.company_id,ARRAY['owner','admin']::public.company_role[]) THEN
      RAISE EXCEPTION 'Organisation administrator approval is required' USING ERRCODE='42501';
    END IF;
    NEW.verified_by:=CASE WHEN NEW.is_verified THEN (SELECT auth.uid()) ELSE NULL END;
    NEW.verified_at:=CASE WHEN NEW.is_verified THEN now() ELSE NULL END;
  END IF;
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.protect_employment_verification() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER protect_employment_verification BEFORE UPDATE ON public.company_employees FOR EACH ROW EXECUTE FUNCTION public.protect_employment_verification();

-- Filter the following feed before pagination; over-fetching then filtering loses posts.
CREATE OR REPLACE FUNCTION public.get_following_feed(p_limit integer DEFAULT 20,p_offset integer DEFAULT 0)
RETURNS SETOF public.federated_feed LANGUAGE sql STABLE SECURITY INVOKER SET search_path = '' AS $$
  SELECT feed.* FROM public.federated_feed feed
  WHERE public.current_session_is_verified() AND EXISTS (
    SELECT 1 FROM public.actors author WHERE author.id=feed.attributed_to AND (
      author.user_id=(SELECT auth.uid())
      OR EXISTS (SELECT 1 FROM public.author_follows f WHERE f.follower_id=(SELECT auth.uid()) AND f.author_id=author.user_id)
      OR EXISTS (SELECT 1 FROM public.user_connections c WHERE c.status='accepted'
        AND ((c.user_id=(SELECT auth.uid()) AND c.connected_user_id=author.user_id) OR (c.connected_user_id=(SELECT auth.uid()) AND c.user_id=author.user_id)))
      OR EXISTS (SELECT 1 FROM public.outgoing_follows f JOIN public.actors own ON own.id=f.local_actor_id
        WHERE own.user_id=(SELECT auth.uid()) AND f.status='accepted' AND f.remote_actor_url=author.remote_actor_url)
    )
  )
  ORDER BY feed.published_at DESC,feed.id DESC
  LIMIT greatest(1,least(coalesce(p_limit,20),100)) OFFSET greatest(0,least(coalesce(p_offset,0),100000));
$$;
REVOKE ALL ON FUNCTION public.get_following_feed(integer,integer) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.get_following_feed(integer,integer) TO authenticated;
COMMIT;
