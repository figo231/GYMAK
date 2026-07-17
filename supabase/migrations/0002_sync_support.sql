-- ============================================================================
-- جيمك (Gymak) — Phase 3 schema, part 2
--
-- 1. profiles.migrated_at — the server-authoritative flag syncManager.js
--    checks before running the first-login migration. Kept separate from
--    updated_at (which reflects ordinary profile edits) so "has this
--    account ever been migrated" and "when was the profile last changed"
--    don't collide.
--
-- 2. updated_at auto-touch triggers — 0001_init.sql gave every row an
--    `updated_at timestamptz default now()`, which only fires on INSERT.
--    Without a trigger, a row's updated_at goes stale the moment it's
--    edited, which is misleading for debugging/observability even though
--    the app's own conflict resolution doesn't read this column (it relies
--    on push-before-pull ordering instead — see syncManager.js's header
--    comment for why that's sufficient here).
-- ============================================================================

alter table public.profiles
  add column if not exists migrated_at timestamptz;

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_updated_at on public.profiles;
create trigger set_updated_at
  before update on public.profiles
  for each row execute procedure public.touch_updated_at();

drop trigger if exists set_updated_at on public.weight_logs;
create trigger set_updated_at
  before update on public.weight_logs
  for each row execute procedure public.touch_updated_at();

drop trigger if exists set_updated_at on public.food_log;
create trigger set_updated_at
  before update on public.food_log
  for each row execute procedure public.touch_updated_at();

drop trigger if exists set_updated_at on public.exercises;
create trigger set_updated_at
  before update on public.exercises
  for each row execute procedure public.touch_updated_at();
