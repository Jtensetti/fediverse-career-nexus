
-- Fix 1: Allow editors (and all role holders) to read their own role
CREATE POLICY "Users view own role" ON public.company_roles
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- Fix 2: Drop the old blanket SELECT policy that overrides the verified-only one
DROP POLICY IF EXISTS "Public view employees" ON public.company_employees;
