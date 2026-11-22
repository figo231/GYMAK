create table if not exists public.own_push_test_limit(owner_id uuid primary key references auth.users(id) on delete cascade,last_test timestamptz not null);
alter table public.own_push_test_limit enable row level security;
revoke all on public.own_push_test_limit from public,anon,authenticated;
create or replace function public.claim_own_push_test(p_owner uuid) returns boolean
language plpgsql security definer set search_path='' as $$
declare claimed uuid;
begin
 if not exists(select 1 from public.admin_users where user_id=p_owner and role='super_admin') then return false;end if;
 insert into public.own_push_test_limit values(p_owner,clock_timestamp())
 on conflict(owner_id) do update set last_test=excluded.last_test
 where public.own_push_test_limit.last_test < clock_timestamp()-interval '60 seconds'
 returning owner_id into claimed;
 return claimed is not null;
end $$;
revoke all on function public.claim_own_push_test(uuid) from public,anon,authenticated;
grant execute on function public.claim_own_push_test(uuid) to service_role;
