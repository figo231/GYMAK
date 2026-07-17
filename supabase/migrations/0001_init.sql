-- ============================================================================
-- جيمك (Gymak) — Phase 3 schema
--
-- Design notes (read before editing):
--
-- 1. Achievements are NOT a table. The original store computes them live from
--    streaks/sets/level/PRs (see getAchievements() in gymakStore.js) and this
--    stays true in the cloud version — once weight_logs, exercise_logs,
--    pr_history, and profiles.level/xp are synced, achievements are correct
--    automatically. Adding a table for them would just be a second source of
--    truth to keep in sync with the first.
--
-- 2. "Program progress" = profiles.active_program_id only. The 4 programs
--    themselves (Arnold Split, PPL, Upper/Lower, Full Body) are static app
--    content shipped in the client, not user data — there's nothing else to
--    sync for them.
--
-- 3. Conflict resolution strategy (multi-device), by table shape:
--    - profiles: single row per user -> last-write-wins on `updated_at`.
--      The client compares local vs remote updated_at and keeps the newer
--      whole row. Simple, and correct for a settings/identity record where
--      concurrent edits from two devices in the same second are not a
--      realistic case worth field-level merging for.
--    - weight_logs / food_log: one row per (user_id, date) -> also
--      last-write-wins per row, via the same updated_at comparison, upserted
--      on the (user_id, date) unique constraint. Matches the original
--      client's own behavior (re-logging today's weight overwrites today's
--      entry, never creates a second one).
--    - exercise_logs / pr_history / workout_days: append-only event logs.
--      These are UNION-merged, never overwritten — every local row not yet
--      present remotely (matched by client_id, see below) gets inserted,
--      and vice versa on pull. There is no "conflict" here by design: two
--      devices logging different sets on the same day are both kept.
--    - exercises (custom, user-added): upserted by id (the client already
--      generates a stable slug id for these), last-write-wins on edits.
--
-- 4. client_id: every row the client creates gets a client-generated UUID
--    (crypto.randomUUID()) as its primary key *before* it's sent to
--    Supabase, rather than letting Postgres generate it. This is what makes
--    the union-merge idempotent — re-syncing the same local row twice (e.g.
--    after a dropped connection) is a harmless upsert on the same id, not a
--    duplicate insert.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  name text not null default '',
  username text not null default '',
  bio text not null default '',
  avatar text,
  cover text,
  cover_gradient text not null default 'g1',
  gender text,
  height_cm numeric,
  level integer not null default 1,
  xp integer not null default 0,
  xp_next integer not null default 500,
  member_since date not null default current_date,
  goal_weight numeric,
  active_program_id text,
  best_streak integer not null default 0,
  unit text not null default 'kg',
  lang text not null default 'ar',
  notif_enabled boolean not null default false,
  notif_time text not null default '19:00',
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "profiles: select own" on public.profiles
  for select using (auth.uid() = id);
create policy "profiles: insert own" on public.profiles
  for insert with check (auth.uid() = id);
create policy "profiles: update own" on public.profiles
  for update using (auth.uid() = id) with check (auth.uid() = id);
create policy "profiles: delete own" on public.profiles
  for delete using (auth.uid() = id);

-- Auto-create a profile row the moment someone signs up, so the client never
-- has to special-case "no profile row yet" after registration.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id) values (new.id);
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ---------------------------------------------------------------------------
-- weight_logs — one row per (user, date), matches addWeight()'s upsert-by-day
-- ---------------------------------------------------------------------------
create table if not exists public.weight_logs (
  id uuid primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  date date not null,
  weight numeric not null,
  body_fat numeric,
  updated_at timestamptz not null default now(),
  unique (user_id, date)
);

alter table public.weight_logs enable row level security;

create policy "weight_logs: select own" on public.weight_logs
  for select using (auth.uid() = user_id);
create policy "weight_logs: insert own" on public.weight_logs
  for insert with check (auth.uid() = user_id);
create policy "weight_logs: update own" on public.weight_logs
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "weight_logs: delete own" on public.weight_logs
  for delete using (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- food_log — one row per (user, date), items stored as jsonb (matches the
-- original's { items: [...], totalKcal, totalProtein, totalCarbs, totalFat })
-- ---------------------------------------------------------------------------
create table if not exists public.food_log (
  id uuid primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  date date not null,
  items jsonb not null default '[]'::jsonb,
  total_kcal numeric not null default 0,
  total_protein numeric not null default 0,
  total_carbs numeric not null default 0,
  total_fat numeric not null default 0,
  updated_at timestamptz not null default now(),
  unique (user_id, date)
);

alter table public.food_log enable row level security;

create policy "food_log: select own" on public.food_log
  for select using (auth.uid() = user_id);
create policy "food_log: insert own" on public.food_log
  for insert with check (auth.uid() = user_id);
create policy "food_log: update own" on public.food_log
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "food_log: delete own" on public.food_log
  for delete using (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- exercises — custom, user-added exercises only. Seed exercises ship in the
-- client bundle and are never written here.
-- ---------------------------------------------------------------------------
create table if not exists public.exercises (
  id text primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  muscle text not null,
  secondary text,
  sets integer not null default 3,
  reps integer not null default 10,
  updated_at timestamptz not null default now()
);

alter table public.exercises enable row level security;

create policy "exercises: select own" on public.exercises
  for select using (auth.uid() = user_id);
create policy "exercises: insert own" on public.exercises
  for insert with check (auth.uid() = user_id);
create policy "exercises: update own" on public.exercises
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "exercises: delete own" on public.exercises
  for delete using (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- exercise_logs — append-only, union-merged across devices (see notes above)
-- ---------------------------------------------------------------------------
create table if not exists public.exercise_logs (
  id uuid primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  exercise_id text not null,
  date date not null,
  weight numeric not null,
  sets integer not null,
  reps integer not null,
  created_at timestamptz not null default now()
);

alter table public.exercise_logs enable row level security;

create policy "exercise_logs: select own" on public.exercise_logs
  for select using (auth.uid() = user_id);
create policy "exercise_logs: insert own" on public.exercise_logs
  for insert with check (auth.uid() = user_id);
create policy "exercise_logs: delete own" on public.exercise_logs
  for delete using (auth.uid() = user_id);
-- No update policy: logs are append-only/immutable by design, matching the
-- original client's own logSet() which only ever pushes, never edits.

create index if not exists exercise_logs_user_exercise_idx
  on public.exercise_logs (user_id, exercise_id, date);

-- ---------------------------------------------------------------------------
-- pr_history — append-only, union-merged
-- ---------------------------------------------------------------------------
create table if not exists public.pr_history (
  id uuid primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  exercise_id text not null,
  exercise_name text not null,
  weight numeric not null,
  prev_weight numeric not null,
  date date not null,
  created_at timestamptz not null default now()
);

alter table public.pr_history enable row level security;

create policy "pr_history: select own" on public.pr_history
  for select using (auth.uid() = user_id);
create policy "pr_history: insert own" on public.pr_history
  for insert with check (auth.uid() = user_id);
create policy "pr_history: delete own" on public.pr_history
  for delete using (auth.uid() = user_id);

create index if not exists pr_history_user_date_idx
  on public.pr_history (user_id, date desc);

-- ---------------------------------------------------------------------------
-- workout_days — the set of dates used to compute streaks. Insert-if-absent,
-- union-merged; a date is either marked or it isn't, so there's no
-- meaningful "conflict" to resolve here at all.
-- ---------------------------------------------------------------------------
create table if not exists public.workout_days (
  user_id uuid not null references auth.users (id) on delete cascade,
  date date not null,
  primary key (user_id, date)
);

alter table public.workout_days enable row level security;

create policy "workout_days: select own" on public.workout_days
  for select using (auth.uid() = user_id);
create policy "workout_days: insert own" on public.workout_days
  for insert with check (auth.uid() = user_id);
create policy "workout_days: delete own" on public.workout_days
  for delete using (auth.uid() = user_id);
