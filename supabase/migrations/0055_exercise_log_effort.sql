-- Additive. Existing append-only policies still apply.
begin;
alter table public.exercise_logs add column if not exists rir integer check(rir between 0 and 5);
alter table public.exercise_logs add column if not exists client_logged_at timestamptz;
notify pgrst,'reload schema';
commit;
