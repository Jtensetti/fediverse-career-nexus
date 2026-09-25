ALTER POLICY "Admin update" ON public.companies WITH CHECK (public.has_company_role(auth.uid(), id, ARRAY['owner'::public.company_role, 'admin'::public.company_role]));
DROP POLICY IF EXISTS "Anyone can view blocked domains" ON public.blocked_domains;
DROP POLICY IF EXISTS "Anyone can view blocked actors" ON public.blocked_actors;
DROP POLICY IF EXISTS "Anyone can read webfinger cache" ON public.webfinger_cache;