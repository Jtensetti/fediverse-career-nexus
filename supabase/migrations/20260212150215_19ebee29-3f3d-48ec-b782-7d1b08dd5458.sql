
-- Fix foreign keys that block auth.users deletion (change NO ACTION to SET NULL)

-- blocked_actors.created_by
ALTER TABLE public.blocked_actors DROP CONSTRAINT IF EXISTS blocked_actors_created_by_fkey;
ALTER TABLE public.blocked_actors ADD CONSTRAINT blocked_actors_created_by_fkey
  FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;

-- blocked_actors.updated_by
ALTER TABLE public.blocked_actors DROP CONSTRAINT IF EXISTS blocked_actors_updated_by_fkey;
ALTER TABLE public.blocked_actors ADD CONSTRAINT blocked_actors_updated_by_fkey
  FOREIGN KEY (updated_by) REFERENCES auth.users(id) ON DELETE SET NULL;

-- blocked_domains.created_by
ALTER TABLE public.blocked_domains DROP CONSTRAINT IF EXISTS blocked_domains_created_by_fkey;
ALTER TABLE public.blocked_domains ADD CONSTRAINT blocked_domains_created_by_fkey
  FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;

-- blocked_domains.updated_by
ALTER TABLE public.blocked_domains DROP CONSTRAINT IF EXISTS blocked_domains_updated_by_fkey;
ALTER TABLE public.blocked_domains ADD CONSTRAINT blocked_domains_updated_by_fkey
  FOREIGN KEY (updated_by) REFERENCES auth.users(id) ON DELETE SET NULL;

-- content_reports.reviewed_by
ALTER TABLE public.content_reports DROP CONSTRAINT IF EXISTS content_reports_reviewed_by_fkey;
ALTER TABLE public.content_reports ADD CONSTRAINT content_reports_reviewed_by_fkey
  FOREIGN KEY (reviewed_by) REFERENCES auth.users(id) ON DELETE SET NULL;

-- security_incidents.reported_by
ALTER TABLE public.security_incidents DROP CONSTRAINT IF EXISTS security_incidents_reported_by_fkey;
ALTER TABLE public.security_incidents ADD CONSTRAINT security_incidents_reported_by_fkey
  FOREIGN KEY (reported_by) REFERENCES auth.users(id) ON DELETE SET NULL;
