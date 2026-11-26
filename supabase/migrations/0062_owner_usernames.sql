begin;
create or replace function public.chat_users(p_search text default '', p_role text default 'all',
  p_before_at timestamptz default null, p_before_id uuid default null) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare v_search text := lower(left(btrim(coalesce(p_search, '')), 120)); v_out jsonb;
begin
  if not public.chat_is_owner() then raise exception 'owner_only' using errcode = '42501'; end if;
  if p_role is null or p_role not in ('all','user','coach','doctor') then raise exception 'invalid_role'; end if;
  if (p_before_at is null) <> (p_before_id is null) then raise exception 'invalid_cursor'; end if;
  with accounts as materialized (
    select u.id user_id, u.email::text email, coalesce(u.created_at, 'epoch'::timestamptz) created_at, (u.created_at is not null) has_registered_at,
      coalesce(nullif(btrim(p.name),''), nullif(btrim(p.username),''), 'مستخدم')::text label,
      public.chat_role_for(u.id) role, (p.id is not null) has_profile, p.username,
      case when p.gender in ('male','female') then p.gender else null end gender,
      lower(coalesce(u.email,'') || ' ' || coalesce(p.name,'') || ' ' || coalesce(p.username,'')) search_text
    from auth.users u left join public.profiles p on p.id = u.id
  ), matches as materialized (
    select * from accounts a where (v_search = '' or strpos(a.search_text, v_search) > 0)
      and (p_role = 'all' or a.role = p_role)
  ), page as (
    select * from matches a where p_before_at is null or (a.created_at,a.user_id) < (p_before_at,p_before_id)
    order by a.created_at desc,a.user_id desc limit 51
  ), shown as (select * from page order by created_at desc,user_id desc limit 50)
  select jsonb_build_object(
    'users', coalesce((select jsonb_agg(to_jsonb(s) - 'search_text' order by s.created_at desc,s.user_id desc) from shown s),'[]'::jsonb),
    'has_more', (select count(*) > 50 from page), 'matching_count', (select count(*) from matches),
    'counts', jsonb_build_object('registered',(select count(*) from accounts),
      'missing_profiles',(select count(*) from accounts where not has_profile),
      'doctors',(select count(*) from accounts where role='doctor'),
      'coaches',(select count(*) from accounts where role='coach'),
      'legacy_coaches',(select count(*) from public.coach_grants g where not exists(select 1 from auth.users u where lower(u.email)=g.email)))
  ) into v_out;
  return v_out;
end $$;

commit;
