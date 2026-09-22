BEGIN;

-- A personal feed is a private reading preference, including its chosen people.
DROP POLICY IF EXISTS "Users can view own and public feeds" ON public.custom_feeds;
DROP POLICY IF EXISTS "Users can create custom feeds" ON public.custom_feeds;
DROP POLICY IF EXISTS "Users can update their custom feeds" ON public.custom_feeds;
DROP POLICY IF EXISTS "Users can delete their custom feeds" ON public.custom_feeds;
CREATE POLICY personal_feeds_owner ON public.custom_feeds FOR ALL TO authenticated
  USING (user_id=(SELECT auth.uid()) AND (SELECT public.current_session_is_verified()))
  WITH CHECK (user_id=(SELECT auth.uid()) AND (SELECT public.current_session_is_verified()) AND NOT is_public);
REVOKE ALL ON public.custom_feeds FROM anon;
GRANT SELECT,INSERT,UPDATE,DELETE ON public.custom_feeds TO authenticated;

ALTER TABLE public.user_feed_preferences ADD COLUMN IF NOT EXISTS infinite_scroll boolean NOT NULL DEFAULT false;
CREATE POLICY feed_preferences_verified ON public.user_feed_preferences AS RESTRICTIVE FOR ALL TO authenticated
  USING ((SELECT public.current_session_is_verified())) WITH CHECK ((SELECT public.current_session_is_verified()));

CREATE FUNCTION public.valid_personal_feed_rules(rules jsonb) RETURNS boolean
LANGUAGE plpgsql IMMUTABLE SECURITY INVOKER SET search_path='' AS $$
DECLARE rule record; item jsonb;
BEGIN
  IF jsonb_typeof(rules) IS DISTINCT FROM 'object' THEN RETURN false; END IF;
  FOR rule IN SELECT * FROM jsonb_each(rules) LOOP
    IF rule.key NOT IN ('include_tags','exclude_tags','include_keywords','exclude_keywords','include_users','include_actors','include_companies','language')
      OR jsonb_typeof(rule.value) IS DISTINCT FROM 'array' THEN RETURN false; END IF;
    IF jsonb_array_length(rule.value)>50 THEN RETURN false; END IF;
    FOR item IN SELECT value FROM jsonb_array_elements(rule.value) LOOP
      IF jsonb_typeof(item) IS DISTINCT FROM 'string' OR length(btrim(item#>>'{}')) NOT BETWEEN 1 AND 80 THEN RETURN false; END IF;
      IF rule.key IN ('include_users','include_actors','include_companies') AND (item#>>'{}') !~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$' THEN RETURN false; END IF;
    END LOOP;
  END LOOP;
  RETURN true;
END $$;
ALTER TABLE public.custom_feeds ADD CONSTRAINT personal_feed_size CHECK (
  length(btrim(name)) BETWEEN 1 AND 60 AND length(coalesce(description,''))<=300
  AND public.valid_personal_feed_rules(rules)
);
REVOKE ALL ON FUNCTION public.valid_personal_feed_rules(jsonb) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.valid_personal_feed_rules(jsonb) TO authenticated,service_role;

CREATE FUNCTION public.get_member_feed(p_feed text DEFAULT 'following',p_limit integer DEFAULT 20,p_offset integer DEFAULT 0)
RETURNS SETOF public.federated_feed LANGUAGE plpgsql STABLE SECURITY INVOKER SET search_path='' AS $$
DECLARE chosen_rules jsonb; prefs public.user_feed_preferences; viewer uuid := (SELECT auth.uid());
BEGIN
  IF viewer IS NULL OR NOT public.current_session_is_verified() THEN
    RAISE EXCEPTION 'Sign in to read this feed' USING ERRCODE='42501';
  END IF;
  IF p_feed IS NULL THEN RAISE EXCEPTION 'Unknown feed' USING ERRCODE='22023'; END IF;
  IF p_feed NOT IN ('following','local','federated') THEN
    SELECT rules INTO chosen_rules FROM public.custom_feeds WHERE id::text=p_feed AND user_id=viewer;
    IF NOT FOUND THEN RAISE EXCEPTION 'Feed not available' USING ERRCODE='42501'; END IF;
  END IF;
  SELECT * INTO prefs FROM public.user_feed_preferences WHERE user_id=viewer;
  RETURN QUERY
  SELECT ap.id,ap.type,ap.content,ap.attributed_to,ap.company_id,ap.published_at,
    CASE WHEN a.is_remote THEN 'remote'::text ELSE 'local'::text END
  FROM public.ap_objects ap
  JOIN public.public_actors a ON a.id=ap.attributed_to
  CROSS JOIN LATERAL (SELECT CASE WHEN ap.type='Create' THEN ap.content->'object'
    WHEN ap.type='Announce' AND jsonb_typeof(ap.content->'object')='object' THEN ap.content->'object'
    ELSE ap.content END AS body) n
  CROSS JOIN LATERAL (SELECT lower(regexp_replace(coalesce(n.body->>'content','')||' '||coalesce(n.body->>'name','')||' '||coalesce(n.body->>'summary',''),'<[^>]*>',' ','g')) AS text) plain
  CROSS JOIN LATERAL (SELECT coalesce(array_agg(DISTINCT tag),ARRAY[]::text[]) AS tags FROM (
    SELECT lower(ltrim(value->>'name','#')) AS tag FROM jsonb_array_elements(
      CASE WHEN jsonb_typeof(n.body->'tag')='array' THEN n.body->'tag' ELSE '[]'::jsonb END)
      WHERE value->>'type'='Hashtag'
    UNION ALL
    SELECT lower(m[1]) FROM regexp_matches(plain.text,'(?:^|[^[:alnum:]_])#([[:alnum:]_]+)','g') m
  ) found) hashtags
  WHERE ap.type IN ('Note','Article','Create','Announce')
    AND coalesce(n.body->>'type','Note') NOT IN ('Like','Delete','Tombstone')
    AND (p_feed<>'local' OR NOT coalesce(a.is_remote,false))
    AND (coalesce(prefs.show_reposts,true) OR ap.type<>'Announce')
    AND (coalesce(prefs.show_replies,false) OR n.body->>'inReplyTo' IS NULL)
    AND NOT public.is_user_blocked(viewer,a.user_id) AND NOT public.is_user_blocked(a.user_id,viewer)
    AND NOT EXISTS (SELECT 1 FROM unnest(prefs.muted_words) word WHERE btrim(word)<>'' AND strpos(plain.text,lower(word))>0)
    AND (coalesce(cardinality(prefs.language_filter),0)=0 OR lower(n.body->>'language')=ANY(prefs.language_filter)
      OR EXISTS(SELECT 1 FROM unnest(prefs.language_filter) lang WHERE n.body->'contentMap' ? lang))
    AND (p_feed<>'following' OR a.user_id=viewer
      OR EXISTS(SELECT 1 FROM public.author_follows f WHERE f.follower_id=viewer AND f.author_id=a.user_id)
      OR EXISTS(SELECT 1 FROM public.user_connections c WHERE c.status='accepted' AND
        ((c.user_id=viewer AND c.connected_user_id=a.user_id) OR (c.connected_user_id=viewer AND c.user_id=a.user_id)))
      OR EXISTS(SELECT 1 FROM public.outgoing_follows f JOIN public.public_actors own ON own.id=f.local_actor_id
        WHERE own.user_id=viewer AND f.status='accepted' AND f.remote_actor_url=a.remote_actor_url))
    AND (chosen_rules IS NULL OR (
      ((chosen_rules->'include_users') ? a.user_id::text
       OR (chosen_rules->'include_actors') ? a.id::text
       OR (chosen_rules->'include_companies') ? ap.company_id::text
       OR EXISTS(SELECT 1 FROM jsonb_array_elements_text(coalesce(chosen_rules->'include_tags','[]')) tag WHERE lower(ltrim(tag,'#'))=ANY(hashtags.tags))
       OR EXISTS(SELECT 1 FROM jsonb_array_elements_text(coalesce(chosen_rules->'include_keywords','[]')) word WHERE strpos(plain.text,lower(word))>0))
      AND NOT EXISTS(SELECT 1 FROM jsonb_array_elements_text(coalesce(chosen_rules->'exclude_tags','[]')) tag WHERE lower(ltrim(tag,'#'))=ANY(hashtags.tags))
      AND NOT EXISTS(SELECT 1 FROM jsonb_array_elements_text(coalesce(chosen_rules->'exclude_keywords','[]')) word WHERE strpos(plain.text,lower(word))>0)
      AND (coalesce(jsonb_array_length(chosen_rules->'language'),0)=0 OR chosen_rules->'language' ? lower(n.body->>'language'))
    ))
  ORDER BY ap.published_at DESC,ap.id DESC
  LIMIT greatest(1,least(coalesce(p_limit,20),100)) OFFSET greatest(0,least(coalesce(p_offset,0),100000));
END $$;
REVOKE ALL ON FUNCTION public.get_member_feed(text,integer,integer) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.get_member_feed(text,integer,integer) TO authenticated;
CREATE INDEX IF NOT EXISTS ap_objects_feed_order_idx ON public.ap_objects(published_at DESC,id DESC);
CREATE FUNCTION public.reset_deleted_feed_default() RETURNS trigger
LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
BEGIN
  UPDATE public.user_feed_preferences SET default_feed='following',updated_at=now()
    WHERE user_id=OLD.user_id AND default_feed=OLD.id::text;
  RETURN OLD;
END $$;
REVOKE ALL ON FUNCTION public.reset_deleted_feed_default() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER reset_deleted_feed_default AFTER DELETE ON public.custom_feeds
  FOR EACH ROW EXECUTE FUNCTION public.reset_deleted_feed_default();
NOTIFY pgrst,'reload schema';
COMMIT;
