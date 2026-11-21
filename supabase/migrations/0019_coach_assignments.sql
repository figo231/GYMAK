-- 0019_coach_assignments.sql
-- A coach can assign a ready-made program to a trainee who has an ACTIVE link.
-- Requires 0018. Safe to re-run. Run once in the Supabase SQL editor.
create table if not exists public.coach_assignments (
  id uuid primary key default gen_random_uuid(),
  coach_id uuid not null references auth.users (id) on delete cascade,
  coach_email text not null,
  trainee_id uuid not null references auth.users (id) on delete cascade,
  program_id text not null check (char_length(program_id) between 1 and 64),
  note text check (note is null or char_length(note) <= 500),
  created_at timestamptz not null default now()
);
create index if not exists coach_assignments_trainee_idx on public.coach_assignments (trainee_id, created_at desc);
alter table public.coach_assignments enable row level security;

drop policy if exists "coach_assignments: coach insert" on public.coach_assignments;
create policy "coach_assignments: coach insert" on public.coach_assignments for insert to authenticated
  with check (coach_id = auth.uid() and coach_email = lower(auth.jwt() ->> 'email') and public.coach_can_see(trainee_id));
drop policy if exists "coach_assignments: read own" on public.coach_assignments;
create policy "coach_assignments: read own" on public.coach_assignments for select to authenticated
  using (coach_id = auth.uid() or trainee_id = auth.uid());
drop policy if exists "coach_assignments: coach delete" on public.coach_assignments;
create policy "coach_assignments: coach delete" on public.coach_assignments for delete to authenticated
  using (coach_id = auth.uid());

revoke all on public.coach_assignments from anon;
revoke update on public.coach_assignments from authenticated;

notify pgrst, 'reload schema';
