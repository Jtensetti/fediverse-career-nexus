DROP VIEW IF EXISTS public.federated_feed;

CREATE VIEW public.federated_feed
WITH (security_invoker=on) AS
SELECT ap.id,
    ap.type,
    ap.content,
    ap.attributed_to,
    ap.company_id,
    ap.published_at,
        CASE
            WHEN (act.is_remote = true) THEN 'remote'::text
            ELSE 'local'::text
        END AS source
   FROM (ap_objects ap
     LEFT JOIN actors act ON ((ap.attributed_to = act.id)))
  WHERE ((ap.type = ANY (ARRAY['Note'::text, 'Article'::text, 'Create'::text, 'Announce'::text])) AND (((ap.type <> 'Announce'::text) AND ((ap.content ->> 'inReplyTo'::text) IS NULL) AND (((ap.content -> 'object'::text) ->> 'inReplyTo'::text) IS NULL)) OR (ap.type = 'Announce'::text)) AND (((ap.content ->> 'type'::text) IS NULL) OR ((ap.content ->> 'type'::text) <> 'Like'::text)))
  ORDER BY ap.published_at DESC;