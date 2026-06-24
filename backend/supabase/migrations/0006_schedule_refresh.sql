-- Schedule the annual refresh (PRD §9.1). Once a year, mid-November (after the
-- IRS publishes the next year's inflation adjustments + the SSA COLA wage base),
-- pg_cron calls ai-refresh-config for NEXT year. That job stages a draft and
-- emails the one-tap approval link — it never writes the live config itself.
--
-- Secrets are NOT hard-coded here. They live in Supabase Vault; the cron command
-- reads them at run time. Run the two inserts below ONCE with your real values
-- (Dashboard → SQL Editor), replacing the placeholders, then run the schedule.

create extension if not exists pg_cron;
create extension if not exists pg_net;

-- ── One-time: store the secrets in Vault (replace the placeholders) ───────────
-- The job authenticates with a dedicated admin secret (header x-admin-secret),
-- which must equal the REFRESH_ADMIN_SECRET set on the Edge Function — NOT the
-- service-role key (the key Supabase injects into the function differs from the
-- dashboard/Vault one, so a Bearer-service-role check is unreliable).
-- select vault.create_secret('https://YOUR-REF.supabase.co', 'project_url');
-- select vault.create_secret('YOUR_REFRESH_ADMIN_SECRET',    'refresh_admin_secret');
-- (To rotate later: select vault.update_secret(id, 'new value') — find id in vault.secrets.)

-- ── The yearly job ───────────────────────────────────────────────────────────
-- 09:00 UTC on November 15 every year. Targets current_year + 1.
select cron.schedule(
  'annual-tax-refresh',
  '0 9 15 11 *',
  $$
  select net.http_post(
    url := (select decrypted_secret from vault.decrypted_secrets where name = 'project_url')
           || '/functions/v1/ai-refresh-config',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-admin-secret',
        (select decrypted_secret from vault.decrypted_secrets where name = 'refresh_admin_secret')
    ),
    body := jsonb_build_object('year', (extract(year from now())::int + 1))
  );
  $$
);

-- To inspect or remove later:
--   select * from cron.job;
--   select * from cron.job_run_details order by start_time desc limit 10;
--   select cron.unschedule('annual-tax-refresh');
