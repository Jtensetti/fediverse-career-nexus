CREATE SCHEMA IF NOT EXISTS cron;
CREATE TABLE cron.job (jobid bigserial PRIMARY KEY, jobname text UNIQUE, schedule text NOT NULL, command text NOT NULL, active boolean NOT NULL DEFAULT true);
CREATE FUNCTION cron.schedule(job_name text, schedule text, command text) RETURNS bigint LANGUAGE sql AS
$$ INSERT INTO cron.job(jobname,schedule,command) VALUES ($1,$2,$3) ON CONFLICT (jobname) DO UPDATE SET schedule=excluded.schedule, command=excluded.command RETURNING jobid $$;
CREATE FUNCTION cron.schedule(schedule text, command text) RETURNS bigint LANGUAGE sql AS
$$ INSERT INTO cron.job(schedule,command) VALUES ($1,$2) RETURNING jobid $$;
CREATE FUNCTION cron.unschedule(job_name text) RETURNS boolean LANGUAGE sql AS $$ WITH d AS (DELETE FROM cron.job WHERE jobname=$1 RETURNING 1) SELECT EXISTS (SELECT 1 FROM d) $$;
CREATE FUNCTION cron.unschedule(job_id bigint) RETURNS boolean LANGUAGE sql AS $$ WITH d AS (DELETE FROM cron.job WHERE jobid=$1 RETURNING 1) SELECT EXISTS (SELECT 1 FROM d) $$;
