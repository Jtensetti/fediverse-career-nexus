-- Add INSERT policy for company_audit_log so admin actions can be logged from client-side
CREATE POLICY "Admins insert audit" ON public.company_audit_log
FOR INSERT TO authenticated
WITH CHECK (
  public.has_company_role(
    auth.uid(),
    company_id,
    ARRAY['owner','admin']::public.company_role[]
  )
  AND actor_user_id = auth.uid()
);