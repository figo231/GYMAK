-- 0022_feedback.sql
-- In-app "contact us". Signed-in users insert messages; only admins read all; users read their own.
-- Rate limit: 5 messages per hour per user (trigger). Safe to re-run.
create table if not exists public.feedback (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  message text not null check (char_length(message) between 5 and 2000),
  contact_email text check (contact_email is null or char_length(contact_email) <= 200),
  app_version text check (app_version is null or char_length(app_version) <= 40),
  status text not null default 'new' check (status in ('new','read','replied')),
  created_at timestamptz not null default now()
);
create index if not exists feedback_created_idx on public.feedback (created_at desc);
alter table public.feedback enable row level security;

drop policy if exists "feedback: insert own" on public.feedback;
create policy "feedback: insert own" on public.feedback for insert to authenticated with check (user_id = auth.uid());
drop policy if exists "feedback: select own" on public.feedback;
create policy "feedback: select own" on public.feedback for select to authenticated using (user_id = auth.uid());
drop policy if exists "feedback: admin read" on public.feedback;
create policy "feedback: admin read" on public.feedback for select to authenticated using (public.is_admin(auth.uid()));
drop policy if exists "feedback: admin update" on public.feedback;
create policy "feedback: admin update" on public.feedback for update to authenticated using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));

revoke all on public.feedback from anon;

create or replace function public.feedback_rate_limit() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if (select count(*) from public.feedback where user_id = new.user_id and created_at > now() - interval '1 hour') >= 5 then
    raise exception 'rate_limited' using errcode = 'P0001';
  end if;
  return new;
end $$;
drop trigger if exists feedback_rate_limit_trg on public.feedback;
create trigger feedback_rate_limit_trg before insert on public.feedback for each row execute function public.feedback_rate_limit();

notify pgrst, 'reload schema';
