-- Exercise actual role-level statements, even when a predicate matches no row.
-- Permission checks must reject writes before constraints/triggers are reached.
BEGIN;
DO $$
DECLARE v record; r text;
BEGIN
  FOR v IN SELECT c.oid,c.relname FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
    WHERE n.nspname='public' AND c.relkind='v'
  LOOP
    FOREACH r IN ARRAY ARRAY['anon','authenticated'] LOOP
      IF has_table_privilege(r,v.oid,'INSERT,UPDATE,DELETE')
        OR has_any_column_privilege(r,v.oid,'INSERT,UPDATE') THEN
        RAISE EXCEPTION 'View % is writable by %',v.relname,r;
      END IF;
    END LOOP;
  END LOOP;
END $$;
SET ROLE anon;
SELECT public.test_rejected('UPDATE public.public_profiles SET is_verified=true WHERE false','42501');
SELECT public.test_rejected('DELETE FROM public.public_profiles WHERE false','42501');
SELECT public.test_rejected('INSERT INTO public.public_profiles (username) VALUES (''forged'')','42501');
SELECT public.test_rejected('UPDATE public.public_education SET verification_status=''verified'' WHERE false','42501');
SELECT public.test_rejected('DELETE FROM public.public_experiences WHERE false','42501');
SELECT public.test_assert((SELECT count(*)>=0 FROM public.public_profiles),'public profile reads remain available');
SELECT public.test_assert((SELECT count(*)>=0 FROM public.public_education),'public education reads remain available');
SELECT public.test_assert((SELECT count(*)>=0 FROM public.public_experiences),'public experience reads remain available');
RESET ROLE;
SET ROLE authenticated;
SELECT public.test_rejected('UPDATE public.public_profiles SET is_verified=true WHERE false','42501');
SELECT public.test_rejected('DELETE FROM public.public_education WHERE false','42501');
SELECT public.test_rejected('INSERT INTO public.public_experiences (title) VALUES (''forged'')','42501');
SELECT public.test_assert(has_column_privilege('authenticated','public.profiles','fullname','UPDATE'),'normal profile edits retain their base-table grant');
SELECT public.test_assert(has_column_privilege('authenticated','public.experiences','title','UPDATE'),'normal CV edits retain their base-table grant');
RESET ROLE;
ROLLBACK;
