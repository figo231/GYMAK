-- 0018_roles_content_coach.sql
-- Owner panel (editable content) + coach roles + coach/trainee links.
-- Run once in the Supabase dashboard: SQL Editor > New query > paste > Run.
-- Assumes public.is_admin(uuid) already exists (used by 0016/0017).
-- Everything here is additive. Rollback notes at the bottom.

-- 0. Make sure the owner is an admin (idempotent). Needs the owner to have
-- signed up in the app once with this email. Assumes admin_users(user_id, role)
-- as used by supabase/functions/_shared/verifyAdmin.ts.
insert into public.admin_users (user_id, role)
select u.id, 'super_admin' from auth.users u
where lower(u.email) = 'kareemmohamed7392@gmail.com'
  and not exists (select 1 from public.admin_users a where a.user_id = u.id);

-- ---------------------------------------------------------------------------
-- 1. Editable content (owner panel). Public read, admin write.
-- ---------------------------------------------------------------------------
create table if not exists public.content_exercises (
  id text primary key,
  data jsonb not null,
  active boolean not null default true,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users (id)
);
create table if not exists public.content_foods (
  id text primary key,
  data jsonb not null,
  active boolean not null default true,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users (id)
);
alter table public.content_exercises enable row level security;
alter table public.content_foods enable row level security;

drop policy if exists "content_exercises: public read" on public.content_exercises;
create policy "content_exercises: public read" on public.content_exercises for select using (true);
drop policy if exists "content_exercises: admin write" on public.content_exercises;
create policy "content_exercises: admin write" on public.content_exercises for all to authenticated
  using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));

drop policy if exists "content_foods: public read" on public.content_foods;
create policy "content_foods: public read" on public.content_foods for select using (true);
drop policy if exists "content_foods: admin write" on public.content_foods;
create policy "content_foods: admin write" on public.content_foods for all to authenticated
  using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));

-- ---------------------------------------------------------------------------
-- 2. Coach role, identified by email. Only an admin can grant or revoke.
-- ---------------------------------------------------------------------------
create table if not exists public.coach_grants (
  email text primary key check (email = lower(email)),
  granted_by uuid references auth.users (id),
  created_at timestamptz not null default now()
);
alter table public.coach_grants enable row level security;

create or replace function public.is_coach(uid uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.coach_grants g
    join auth.users u on lower(u.email) = g.email
    where u.id = uid
  );
$$;

drop policy if exists "coach_grants: admin all" on public.coach_grants;
create policy "coach_grants: admin all" on public.coach_grants for all to authenticated
  using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));
drop policy if exists "coach_grants: coach sees self" on public.coach_grants;
create policy "coach_grants: coach sees self" on public.coach_grants for select to authenticated
  using (email = lower(auth.jwt() ->> 'email'));

-- ---------------------------------------------------------------------------
-- 3. Coach <-> trainee links. A trainee must ACCEPT before a coach sees data.
-- ---------------------------------------------------------------------------
create table if not exists public.coach_links (
  id uuid primary key default gen_random_uuid(),
  coach_id uuid not null references auth.users (id) on delete cascade,
  trainee_email text not null check (trainee_email = lower(trainee_email)),
  trainee_id uuid references auth.users (id) on delete cascade,
  status text not null default 'pending' check (status in ('pending','active','revoked')),
  created_at timestamptz not null default now(),
  unique (coach_id, trainee_email)
);
alter table public.coach_links enable row level security;

-- Coach: create invites and see/revoke their own links (only if they are a coach).
drop policy if exists "coach_links: coach read" on public.coach_links;
create policy "coach_links: coach read" on public.coach_links for select to authenticated
  using (coach_id = auth.uid() or trainee_email = lower(auth.jwt() ->> 'email') or public.is_admin(auth.uid()));
drop policy if exists "coach_links: coach invite" on public.coach_links;
create policy "coach_links: coach invite" on public.coach_links for insert to authenticated
  with check (coach_id = auth.uid() and public.is_coach(auth.uid()) and status = 'pending' and trainee_id is null);
drop policy if exists "coach_links: coach revoke" on public.coach_links;
create policy "coach_links: coach revoke" on public.coach_links for update to authenticated
  using (coach_id = auth.uid()) with check (coach_id = auth.uid() and status = 'revoked');
-- Trainee: accept (pending -> active, binding their own id) or revoke.
drop policy if exists "coach_links: trainee respond" on public.coach_links;
create policy "coach_links: trainee respond" on public.coach_links for update to authenticated
  using (trainee_email = lower(auth.jwt() ->> 'email'))
  with check (trainee_email = lower(auth.jwt() ->> 'email') and trainee_id = auth.uid() and status in ('active','revoked'));

create or replace function public.coach_can_see(trainee uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.coach_links l
    where l.coach_id = auth.uid() and l.trainee_id = trainee and l.status = 'active'
  ) and public.is_coach(auth.uid());
$$;

-- ---------------------------------------------------------------------------
-- 4. Read-only coach access to a trainee's data (OR'd with the owner policies).
-- ---------------------------------------------------------------------------
drop policy if exists "profiles: coach read" on public.profiles;
create policy "profiles: coach read" on public.profiles for select to authenticated using (public.coach_can_see(id));
drop policy if exists "weight_logs: coach read" on public.weight_logs;
create policy "weight_logs: coach read" on public.weight_logs for select to authenticated using (public.coach_can_see(user_id));
drop policy if exists "food_log: coach read" on public.food_log;
create policy "food_log: coach read" on public.food_log for select to authenticated using (public.coach_can_see(user_id));
drop policy if exists "exercise_logs: coach read" on public.exercise_logs;
create policy "exercise_logs: coach read" on public.exercise_logs for select to authenticated using (public.coach_can_see(user_id));
drop policy if exists "pr_history: coach read" on public.pr_history;
create policy "pr_history: coach read" on public.pr_history for select to authenticated using (public.coach_can_see(user_id));
drop policy if exists "workout_days: coach read" on public.workout_days;
create policy "workout_days: coach read" on public.workout_days for select to authenticated using (public.coach_can_see(user_id));

-- Verification (as the admin, SQL editor):
--   select tablename, policyname from pg_policies where policyname like '%coach%' or tablename like 'content_%';
-- Rollback (manual): drop the "coach read" policies, then drop tables coach_links, coach_grants,
-- content_foods, content_exercises and functions coach_can_see, is_coach.
