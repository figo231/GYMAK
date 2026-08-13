-- 0016_admin_profiles_read.sql
-- Sprint 11.3. The Send Notification page's "Specific user" recipient
-- search needs to look up users by name/username. profiles' existing RLS
-- (0001_init.sql) only lets a user read their own row — that policy is
-- untouched. This migration only ADDS a second, admin-only select policy
-- alongside it; Postgres RLS policies are OR'd together, so the existing
-- "own row" access for regular users is unaffected.

alter table public.profiles enable row level security;

drop policy if exists "profiles: admin read" on public.profiles;
create policy "profiles: admin read"
  on public.profiles for select
  to authenticated
  using (public.is_admin(auth.uid()));

-- Verification:
-- select policyname, cmd from pg_policies where tablename = 'profiles';
--   -- expect the original owner policy PLUS this one, both present

-- Rollback (manual):
-- drop policy if exists "profiles: admin read" on public.profiles;
