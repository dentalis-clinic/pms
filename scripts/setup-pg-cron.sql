-- =============================================================================
-- Supabase pg_cron: Appointment Status Resolver
-- =============================================================================
-- Run this ONCE in the Supabase SQL Editor:
--   Dashboard → SQL Editor → New Query → paste → Run
--
-- What it does:
--   Every 5 minutes, transitions time-based appointment statuses:
--     PENDING  + past scheduled time          → OVERDUE
--     CONFIRMED + past scheduled time + 30min → COMPLETED
--
-- This replaces the in-app resolveAppointmentStatuses() calls on the read path,
-- eliminating write operations from every data fetch.
-- =============================================================================

-- Step 1: Create the resolution function
-- SECURITY DEFINER: runs with creator (postgres) privileges
-- SET search_path: prevents search_path injection for SECURITY DEFINER functions
CREATE OR REPLACE FUNCTION public.resolve_appointment_statuses()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- PENDING appointments past their scheduled time → OVERDUE
  UPDATE appointments
  SET status = 'OVERDUE'::"AppointmentStatus",
      "updatedAt" = NOW()
  WHERE status = 'PENDING'::"AppointmentStatus"
    AND "preferredDateTime" < NOW();

  -- CONFIRMED appointments 30 minutes past scheduled time → COMPLETED
  -- 30 minutes = slotDuration from src/lib/config/business-hours.ts
  UPDATE appointments
  SET status = 'COMPLETED'::"AppointmentStatus",
      "updatedAt" = NOW()
  WHERE status = 'CONFIRMED'::"AppointmentStatus"
    AND "preferredDateTime" < NOW() - INTERVAL '30 minutes';
END;
$$;

-- Step 2: Remove existing schedule if present (safe to re-run)
SELECT cron.unschedule(jobid)
FROM cron.job
WHERE jobname = 'resolve-appointment-statuses';

-- Step 3: Schedule to run every 5 minutes
SELECT cron.schedule(
  'resolve-appointment-statuses',   -- unique job name
  '*/5 * * * *',                    -- every 5 minutes
  'SELECT public.resolve_appointment_statuses()'
);

-- =============================================================================
-- Verify the job was created:
-- =============================================================================
-- SELECT jobid, jobname, schedule, active
-- FROM cron.job
-- WHERE jobname = 'resolve-appointment-statuses';
--
-- To run it immediately (for testing):
-- SELECT public.resolve_appointment_statuses();
--
-- To view recent run history:
-- SELECT * FROM cron.job_run_details
-- WHERE jobid = (SELECT jobid FROM cron.job WHERE jobname = 'resolve-appointment-statuses')
-- ORDER BY start_time DESC LIMIT 10;
--
-- To remove the job later:
-- SELECT cron.unschedule('resolve-appointment-statuses');
-- =============================================================================
