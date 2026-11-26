-- Preparation only. Private age must never be added to member/chat profiles.
begin;
create table public.private_account_age(user_id uuid primary key references auth.users(id) on delete cascade,age smallint not null check(age between 1 and 120),recorded_at timestamptz not null default now());
alter table public.private_account_age enable row level security;
revoke all on public.private_account_age from public,anon;
grant select,insert,update,delete on public.private_account_age to authenticated;
create policy own_age_select on public.private_account_age for select to authenticated using(user_id=auth.uid());
create policy own_age_insert on public.private_account_age for insert to authenticated with check(user_id=auth.uid());
create policy own_age_update on public.private_account_age for update to authenticated using(user_id=auth.uid()) with check(user_id=auth.uid());
create policy own_age_delete on public.private_account_age for delete to authenticated using(user_id=auth.uid());
create function public.seed_private_age() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if (new.raw_user_meta_data->>'private_age') ~ '^[0-9]{1,3}$' then
  if (new.raw_user_meta_data->>'private_age')::integer between 1 and 120 then
   insert into public.private_account_age(user_id,age) values(new.id,(new.raw_user_meta_data->>'private_age')::smallint) on conflict(user_id) do nothing;
  end if;
 end if;
 return new;
end$$;
revoke all on function public.seed_private_age() from public,anon,authenticated;
create trigger seed_private_age_after_signup after insert on auth.users for each row execute function public.seed_private_age();
commit;
