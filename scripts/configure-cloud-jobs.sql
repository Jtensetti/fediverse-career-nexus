-- Run only after matching Cloud functions and migrations are deployed.
-- The Vault values are provisioned in the backend runtime; never paste keys here.
BEGIN;
DO $$ BEGIN
  IF (SELECT count(*) FROM vault.secrets WHERE name IN ('nolto_backend_url','nolto_scheduler_service_role')) <> 2 THEN
    RAISE EXCEPTION 'Provision the two scheduler Vault entries first';
  END IF;
  IF to_regclass('public.deletion_requests') IS NULL THEN RAISE EXCEPTION 'Apply privacy migrations first'; END IF;
END $$;
SELECT cron.schedule('nolto-privacy-maintenance','* * * * *',$job$
  SELECT net.http_post(
    url := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name='nolto_backend_url') || '/functions/v1/privacy-maintenance',
    headers := jsonb_build_object('Content-Type','application/json','Authorization','Bearer ' ||
      (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name='nolto_scheduler_service_role')),
    body := '{}'::jsonb, timeout_milliseconds := 60000);
$job$);
-- The delivery worker visits every partition when none is specified. Calling it
-- directly avoids the legacy coordinator's 16 extra invocations and false success summary.
SELECT cron.schedule('nolto-federation-delivery','* * * * *',$job$
  SELECT net.http_post(
    url := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name='nolto_backend_url') || '/functions/v1/federation',
    headers := jsonb_build_object('Content-Type','application/json','Authorization','Bearer ' ||
      (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name='nolto_scheduler_service_role')),
    body := '{"limit":5}'::jsonb, timeout_milliseconds := 60000);
$job$);
SELECT cron.schedule('federation-cleanup-hourly','0 * * * *',$job$
  SELECT net.http_post(
    url := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name='nolto_backend_url') || '/functions/v1/cleanup-scheduler',
    headers := jsonb_build_object('Content-Type','application/json','Authorization','Bearer ' ||
      (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name='nolto_scheduler_service_role')),
    body := '{}'::jsonb, timeout_milliseconds := 60000);
$job$);
SELECT cron.schedule('event-scheduler-daily','0 8 * * *',$job$
  SELECT net.http_post(
    url := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name='nolto_backend_url') || '/functions/v1/event-scheduler',
    headers := jsonb_build_object('Content-Type','application/json','Authorization','Bearer ' ||
      (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name='nolto_scheduler_service_role')),
    body := '{}'::jsonb, timeout_milliseconds := 60000);
$job$);
SELECT cron.alter_job(job_id:=jobid,active:=false) FROM cron.job WHERE jobname IN ('scheduled-data-wipe','federation-coordinator');
COMMIT;
SELECT jobname,schedule,active FROM cron.job ORDER BY jobname;
