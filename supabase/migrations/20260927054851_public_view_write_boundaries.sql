-- Public views are read projections, never a second write API. In particular,
-- owner-executed profile/CV projections must not bypass base-table RLS or
-- column-level write restrictions. Preserve existing SELECT grants and all
-- service-role access; legitimate edits continue through the base tables/RPCs.
DO $$
DECLARE v record; columns text;
BEGIN
  FOR v IN SELECT c.oid,c.relname FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
    WHERE n.nspname='public' AND c.relkind='v'
  LOOP
    EXECUTE format('REVOKE INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER ON public.%I FROM PUBLIC,anon,authenticated',v.relname);
    SELECT string_agg(quote_ident(attname),',') INTO columns FROM pg_attribute
      WHERE attrelid=v.oid AND attnum>0 AND NOT attisdropped;
    IF columns IS NOT NULL THEN
      EXECUTE format('REVOKE INSERT (%s),UPDATE (%s),REFERENCES (%s) ON public.%I FROM PUBLIC,anon,authenticated',columns,columns,columns,v.relname);
    END IF;
  END LOOP;
END $$;

-- These deliberately expose only public columns/visibility-filtered rows.
-- security_invoker would make public profile discovery depend on the private
-- base-table SELECT policy. Keep the projection boundary, and prevent user
-- predicates being pushed ahead of its visibility/deletion filters.
ALTER VIEW public.public_profiles SET (security_barrier=true);
ALTER VIEW public.public_education SET (security_barrier=true);
ALTER VIEW public.public_experiences SET (security_barrier=true);
