-- Optional, pseudonymous signed-in-account activity, never fitness events.
create table if not exists public.app_activity (
  user_id uuid not null references auth.users(id) on delete cascade,
  day date not null default (now() at time zone 'UTC')::date,
  primary key (user_id, day)
);
alter table public.app_activity enable row level security;
revoke all on public.app_activity from anon, authenticated;
create or replace function public.record_app_activity() returns void
language plpgsql security definer set search_path='' as $$
begin
  if auth.uid() is null then raise exception 'sign_in_required' using errcode='42501'; end if;
  insert into public.app_activity(user_id,day) values(auth.uid(),(now() at time zone 'UTC')::date) on conflict do nothing;
  delete from public.app_activity where day < (now() at time zone 'UTC')::date - 90;
end $$;
create or replace function public.clear_my_app_activity() returns void
language plpgsql security definer set search_path='' as $$
begin
  if auth.uid() is null then raise exception 'sign_in_required' using errcode='42501'; end if;
  delete from public.app_activity where user_id=auth.uid();
end $$;
create or replace function public.owner_app_activity() returns jsonb
language plpgsql stable security definer set search_path='' as $$
begin
  if not public.chat_is_owner() then raise exception 'owner_only' using errcode='42501'; end if;
  return (select jsonb_build_object('today',count(distinct user_id) filter(where day=(now() at time zone 'UTC')::date),
    'week',count(distinct user_id) filter(where day >= (now() at time zone 'UTC')::date-6),
    'month',count(distinct user_id) filter(where day >= (now() at time zone 'UTC')::date-29)) from public.app_activity);
end $$;
revoke all on function public.record_app_activity(), public.clear_my_app_activity(), public.owner_app_activity() from public,anon,authenticated;
grant execute on function public.record_app_activity(), public.clear_my_app_activity(), public.owner_app_activity() to authenticated;
