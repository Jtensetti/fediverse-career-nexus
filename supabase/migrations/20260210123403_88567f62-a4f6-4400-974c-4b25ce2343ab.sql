CREATE OR REPLACE FUNCTION public.prevent_self_verification()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Only check if verification fields are being modified
  IF (NEW.is_verified IS DISTINCT FROM OLD.is_verified)
    OR (NEW.verified_at IS DISTINCT FROM OLD.verified_at)
    OR (NEW.verified_by IS DISTINCT FROM OLD.verified_by) THEN
    
    -- Block if the user is verifying themselves AND is not an admin/owner of the company
    IF auth.uid() = NEW.user_id THEN
      -- Allow if user has admin or owner role for this company
      IF NOT EXISTS (
        SELECT 1 FROM public.company_roles
        WHERE company_id = NEW.company_id
          AND user_id = auth.uid()
          AND role IN ('owner', 'admin')
      ) THEN
        RAISE EXCEPTION 'Users cannot modify verification fields';
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END;
$function$