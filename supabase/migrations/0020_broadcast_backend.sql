-- 0020_broadcast_backend.sql
-- Tables behind the owner broadcast (send-notification edge function).
-- Broadcast to everyone goes out to the FCM topic `all_users`; the token-based
-- audiences write notification_deliveries rows (a dispatcher is not deployed
-- yet, so only the topic path actually delivers). Admin-only access via
-- public.is_admin (0018). The edge function uses the service role.
-- Idempotent. Requires 0018.

create table if not exists public.push_topics (
  name text primary key,
  description text,
  created_at timestamptz not null default now()
);
insert into public.push_topics (name, description)
values ('all_users', 'All app users: default broadcast topic')
on conflict (name) do nothing;

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(title) between 1 and 120),
  body text not null check (char_length(body) between 1 and 1000),
  image_url text,
  deep_link text,
  category text not null default 'announcement',
  priority text not null default 'normal' check (priority in ('normal', 'high')),
  audience_type text not null default 'everyone'
    check (audience_type in ('everyone', 'topic', 'single_user', 'selected_users', 'test_device')),
  audience_ref jsonb,
  status text not null default 'draft'
    check (status in ('draft', 'scheduled', 'sending', 'sent', 'failed', 'canceled')),
  scheduled_at timestamptz,
  sent_at timestamptz,
  created_by uuid references auth.users(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now()
);
create index if not exists idx_notifications_status on public.notifications(status, created_at desc);

create table if not exists public.notification_deliveries (
  id uuid primary key default gen_random_uuid(),
  notification_id uuid not null references public.notifications(id) on delete cascade,
  token_id uuid not null references public.push_tokens(id) on delete cascade,
  status text not null default 'pending'
    check (status in ('pending', 'dispatching', 'sent', 'failed_temporary', 'failed_permanent', 'invalid_token')),
  error_code text,
  attempts int not null default 0,
  next_retry_at timestamptz,
  created_at timestamptz not null default now(),
  unique (notification_id, token_id)
);

create table if not exists public.push_preferences (
  user_id uuid not null references auth.users(id) on delete cascade,
  category text not null,
  enabled boolean not null default true,
  primary key (user_id, category)
);

create table if not exists public.admin_audit_log (
  id bigint generated always as identity primary key,
  admin_id uuid references auth.users(id) on delete set null,
  action text not null,
  target_table text,
  target_id text,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.admin_rate_limits (
  admin_id uuid not null references auth.users(id) on delete cascade,
  window_start timestamptz not null,
  send_count int not null default 0,
  primary key (admin_id, window_start)
);

alter table public.push_topics enable row level security;
alter table public.notifications enable row level security;
alter table public.notification_deliveries enable row level security;
alter table public.push_preferences enable row level security;
alter table public.admin_audit_log enable row level security;
alter table public.admin_rate_limits enable row level security;

drop policy if exists "notifications: admin all" on public.notifications;
create policy "notifications: admin all" on public.notifications for all to authenticated
  using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));

drop policy if exists "deliveries: admin read" on public.notification_deliveries;
create policy "deliveries: admin read" on public.notification_deliveries for select to authenticated
  using (public.is_admin(auth.uid()));

drop policy if exists "topics: admin read" on public.push_topics;
create policy "topics: admin read" on public.push_topics for select to authenticated
  using (public.is_admin(auth.uid()));

drop policy if exists "prefs: own" on public.push_preferences;
create policy "prefs: own" on public.push_preferences for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "audit: admin read" on public.admin_audit_log;
create policy "audit: admin read" on public.admin_audit_log for select to authenticated
  using (public.is_admin(auth.uid()));

-- admin_rate_limits: no policy, service role only.

revoke all on public.push_topics, public.notifications, public.notification_deliveries,
  public.push_preferences, public.admin_audit_log, public.admin_rate_limits from anon, authenticated;
grant select, insert, update, delete on public.notifications to authenticated;
grant select on public.notification_deliveries, public.push_topics, public.admin_audit_log to authenticated;
grant select, insert, update, delete on public.push_preferences to authenticated;
grant all on public.push_topics, public.notifications, public.notification_deliveries,
  public.push_preferences, public.admin_audit_log, public.admin_rate_limits to service_role;

notify pgrst, 'reload schema';

-- Verification:
-- select tablename, rowsecurity from pg_tables where tablename in
--   ('notifications','notification_deliveries','push_topics','push_preferences','admin_audit_log','admin_rate_limits');
-- Rollback (manual): drop the six tables above (children first).
