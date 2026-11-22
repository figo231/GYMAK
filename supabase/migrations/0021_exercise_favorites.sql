-- 0021_exercise_favorites.sql
-- One row per user holding their favourite exercise ids (last-write-wins by updated_ms).
-- Safe to re-run. Run once in the Supabase SQL editor.
create table if not exists public.exercise_favorites (
  user_id uuid primary key references auth.users (id) on delete cascade,
  exercise_ids text[] not null default '{}' check (cardinality(exercise_ids) <= 500),
  updated_ms bigint not null default 0 check (updated_ms >= 0),
  updated_at timestamptz not null default now()
);
alter table public.exercise_favorites enable row level security;

drop policy if exists "exercise_favorites: select own" on public.exercise_favorites;
create policy "exercise_favorites: select own" on public.exercise_favorites for select to authenticated using (user_id = auth.uid());
drop policy if exists "exercise_favorites: insert own" on public.exercise_favorites;
create policy "exercise_favorites: insert own" on public.exercise_favorites for insert to authenticated with check (user_id = auth.uid());
drop policy if exists "exercise_favorites: update own" on public.exercise_favorites;
create policy "exercise_favorites: update own" on public.exercise_favorites for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists "exercise_favorites: delete own" on public.exercise_favorites;
create policy "exercise_favorites: delete own" on public.exercise_favorites for delete to authenticated using (user_id = auth.uid());

revoke all on public.exercise_favorites from anon;

notify pgrst, 'reload schema';
