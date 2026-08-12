-- 0015_sprint10_dispatch_support.sql
-- Sprint 10. Additive schema support for the dispatch engine. Does not
-- modify Sprint9_All_In_One.sql — this is a new migration layered on top.

-- Add a transient 'dispatching' status so a batch can be atomically
-- claimed (pending -> dispatching) before being sent, preventing two
-- concurrent dispatch-batch invocations from picking the same rows.
alter table public.notification_deliveries drop constraint if exists notification_deliveries_status_check;
alter table public.notification_deliveries add constraint notification_deliveries_status_check
  check (status in ('pending', 'dispatching', 'sent', 'failed_temporary', 'failed_permanent', 'invalid_token'));

create or replace function public.claim_pending_deliveries(p_notification_id uuid, p_batch_size int)
returns setof public.notification_deliveries
language plpgsql
security definer
set search_path = public
as $$
begin
  return query
    update public.notification_deliveries d
    set status = 'dispatching'
    from (
      select id from public.notification_deliveries
      where notification_id = p_notification_id and status = 'pending'
      order by created_at
      limit p_batch_size
      for update skip locked
    ) claimed
    where d.id = claimed.id
    returning d.*;
end;
$$;

revoke all on function public.claim_pending_deliveries(uuid, int) from public;
grant execute on function public.claim_pending_deliveries(uuid, int) to service_role;

create or replace function public.claim_due_retries(p_batch_size int)
returns setof public.notification_deliveries
language plpgsql
security definer
set search_path = public
as $$
begin
  return query
    update public.notification_deliveries d
    set status = 'dispatching'
    from (
      select id from public.notification_deliveries
      where status = 'failed_temporary' and next_retry_at <= now()
      order by next_retry_at
      limit p_batch_size
      for update skip locked
    ) claimed
    where d.id = claimed.id
    returning d.*;
end;
$$;

revoke all on function public.claim_due_retries(int) from public;
grant execute on function public.claim_due_retries(int) to service_role;

-- Default topic used for 'everyone' sends.
insert into public.push_topics (name, description)
values ('all_users', 'All app users — default broadcast topic')
on conflict (name) do nothing;

-- ---------------------------------------------------------------------
-- pg_cron scheduling. Requires the pg_cron and pg_net extensions (enabled
-- by default on Supabase projects under the "extensions" schema).
--
-- ONE-TIME MANUAL SETUP (not executed automatically by this migration —
-- run once via the SQL Editor, with your real values, before the cron
-- jobs below can reach your Edge Functions):
--   select vault.create_secret('https://your-project-ref.supabase.co', 'gymak_project_url');
--   select vault.create_secret('your-real-service-role-key', 'gymak_service_role_key');
-- The cron job bodies below reference these secrets by name via
-- vault.decrypted_secrets — no literal URL or key is ever embedded in
-- executable code in this file.
-- ---------------------------------------------------------------------
create extension if not exists pg_cron;
create extension if not exists pg_net;

select cron.schedule(
  'dispatch-scheduled-notifications',
  '* * * * *',
  $cron$
  select net.http_post(
    url := (select decrypted_secret from vault.decrypted_secrets where name = 'gymak_project_url') || '/functions/v1/dispatch-scheduled',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'gymak_service_role_key'),
      'Content-Type', 'application/json'
    ),
    body := '{}'::jsonb
  );
  $cron$
);

select cron.schedule(
  'dispatch-batch-tick',
  '10 seconds',
  $cron$
  select net.http_post(
    url := (select decrypted_secret from vault.decrypted_secrets where name = 'gymak_project_url') || '/functions/v1/dispatch-batch',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'gymak_service_role_key'),
      'Content-Type', 'application/json'
    ),
    body := '{}'::jsonb
  );
  $cron$
);

select cron.schedule(
  'retry-failed-deliveries-tick',
  '*/5 * * * *',
  $cron$
  select net.http_post(
    url := (select decrypted_secret from vault.decrypted_secrets where name = 'gymak_project_url') || '/functions/v1/retry-failed-deliveries',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'gymak_service_role_key'),
      'Content-Type', 'application/json'
    ),
    body := '{}'::jsonb
  );
  $cron$
);

-- Verification:
-- select conname from pg_constraint where conname = 'notification_deliveries_status_check';
-- select proname from pg_proc where proname in ('claim_pending_deliveries','claim_due_retries');
-- select jobname from cron.job;
-- select name from public.push_topics where name = 'all_users';

-- Rollback (manual):
-- select cron.unschedule('dispatch-scheduled-notifications');
-- select cron.unschedule('dispatch-batch-tick');
-- select cron.unschedule('retry-failed-deliveries-tick');
-- drop function if exists public.claim_pending_deliveries(uuid, int);
-- drop function if exists public.claim_due_retries(int);
