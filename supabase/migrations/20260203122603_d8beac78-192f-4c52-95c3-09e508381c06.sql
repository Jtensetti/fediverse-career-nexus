-- Create safe views that exclude verification_token
CREATE VIEW public.public_experiences WITH (security_invoker = true) AS
SELECT 
    id,
    user_id,
    title,
    company,
    is_current_role,
    start_date,
    end_date,
    location,
    description,
    verification_status,
    company_domain,
    created_at,
    updated_at
FROM experiences;

CREATE VIEW public.public_education WITH (security_invoker = true) AS
SELECT 
    id,
    user_id,
    institution,
    degree,
    field,
    start_year,
    end_year,
    verification_status,
    created_at,
    updated_at
FROM education;

-- Grant SELECT on views to authenticated users
GRANT SELECT ON public.public_experiences TO authenticated;
GRANT SELECT ON public.public_education TO authenticated;

-- Drop the policies that expose verification_token to connected users
DROP POLICY IF EXISTS "Connected users can view experiences" ON experiences;
DROP POLICY IF EXISTS "Connected users can view education" ON education;