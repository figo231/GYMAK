begin;
alter table public.chat_profiles add column discoverable boolean not null default false;
create table public.chat_lookup_limits(user_id uuid primary key references auth.users(id) on delete cascade,window_at timestamptz not null default now(),hits integer not null default 0);
create table public.chat_direct_links(a uuid not null references auth.users(id) on delete cascade,b uuid not null references auth.users(id) on delete cascade,created_at timestamptz not null default now(),primary key(a,b),check(a<b));
alter table public.chat_lookup_limits enable row level security;alter table public.chat_direct_links enable row level security;
revoke all on public.chat_lookup_limits,public.chat_direct_links from public,anon,authenticated;grant all on public.chat_lookup_limits,public.chat_direct_links to service_role;
alter table public.chat_conversations drop constraint chat_conversations_kind_check;
alter table public.chat_conversations add constraint chat_conversations_kind_check check(kind in('coach','doctor','support','direct'));
create function public.chat_discovery_save(p_enabled boolean) returns void language plpgsql security definer set search_path='' as $$begin
 if auth.uid() is null then raise exception 'not_authenticated' using errcode='42501';end if;
 if p_enabled is null then raise exception 'invalid_preference';end if;
 if p_enabled and not exists(select 1 from public.profiles where id=auth.uid() and char_length(btrim(username))>=3) then raise exception 'username_required';end if;
 insert into public.chat_profiles(user_id,discoverable) values(auth.uid(),p_enabled) on conflict(user_id) do update set discoverable=excluded.discoverable;
end $$;
create function public.chat_discovery_status() returns jsonb language sql stable security definer set search_path='' as $$select jsonb_build_object('enabled',coalesce((select discoverable from public.chat_profiles where user_id=auth.uid()),false),'username',(select username from public.profiles where id=auth.uid())) where auth.uid() is not null$$;
create function public.chat_username_lookup(p_username text) returns jsonb language plpgsql security definer set search_path='' as $$
declare n integer;u uuid;begin
 if auth.uid() is null then raise exception 'not_authenticated' using errcode='42501';end if;
 if not public.chat_has_consent_v2() then raise exception 'consent_required' using errcode='42501';end if;
 if p_username is null or char_length(btrim(p_username)) not between 3 and 40 then raise exception 'invalid_username';end if;
 insert into public.chat_lookup_limits(user_id,hits) values(auth.uid(),1) on conflict(user_id) do update set hits=case when public.chat_lookup_limits.window_at<now()-interval '1 minute' then 1 else public.chat_lookup_limits.hits+1 end,window_at=case when public.chat_lookup_limits.window_at<now()-interval '1 minute' then now() else public.chat_lookup_limits.window_at end returning hits into n;
 if n>15 then return jsonb_build_object('limited',true);end if;
 select p.id into u from public.profiles p join public.chat_profiles cp on cp.user_id=p.id and cp.discoverable
 where lower(p.username)=lower(btrim(p_username)) and p.id<>auth.uid() and not public.chat_blocked_between(auth.uid(),p.id)
 and exists(select 1 from public.terms_acceptances t where t.user_id=p.id and t.version='2026-11-23-tou-v1') order by p.id limit 1;
 if u is null then return null;end if;
 return jsonb_build_object('user_id',u,'username',(select username from public.profiles where id=u),'label',coalesce((select nullif(display_name,'') from public.chat_profiles where user_id=u and visible),(select username from public.profiles where id=u)),'verified',exists(select 1 from public.chat_verifications where user_id=u) or exists(select 1 from public.admin_users where user_id=u and role='super_admin'));
end $$;
create function public.chat_link_active_before_direct(p_client uuid,p_professional uuid,p_kind text) returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.terms_acceptances where user_id=p_professional and version='2026-11-23-tou-v1')
 and case when p_kind='support' then exists(select 1 from public.admin_users where user_id=p_professional and role='super_admin')
 when p_kind='doctor' then public.chat_role_for(p_professional)='doctor'
 when p_kind='coach' then public.chat_role_for(p_professional)='coach' and exists(select 1 from public.coach_links where coach_id=p_professional and trainee_id=p_client and status='active') else false end;
$$;

create or replace function public.chat_link_active_v2(p_client uuid,p_professional uuid,p_kind text) returns boolean language sql stable security definer set search_path='' as $$select case when p_kind='direct' then exists(select 1 from public.chat_direct_links where a=least(p_client,p_professional) and b=greatest(p_client,p_professional)) and exists(select 1 from public.terms_acceptances where user_id=p_professional and version='2026-11-23-tou-v1') else public.chat_link_active_before_direct(p_client,p_professional,p_kind) end$$;
-- Existing versioned RPCs resolve this wrapper at runtime. No clinical permissions are granted by a direct link.
create function public.chat_username_start(p_user_id uuid) returns uuid language plpgsql security definer set search_path='' as $$
declare result uuid;begin
 if auth.uid() is null then raise exception 'not_authenticated' using errcode='42501';end if;
 if not public.chat_has_consent_v2() then raise exception 'consent_required' using errcode='42501';end if;
 if p_user_id=auth.uid() or not exists(select 1 from public.chat_profiles p join public.profiles n on n.id=p.user_id where p.user_id=p_user_id and p.discoverable and char_length(btrim(n.username))>=3) then raise exception 'chat_not_allowed' using errcode='42501';end if;
 if public.chat_blocked_between(auth.uid(),p_user_id) then raise exception 'chat_blocked' using errcode='42501';end if;
 perform pg_advisory_xact_lock(hashtext(least(auth.uid(),p_user_id)::text));
 select id into result from public.chat_conversations where kind='direct' and least(client_id,professional_id)=least(auth.uid(),p_user_id) and greatest(client_id,professional_id)=greatest(auth.uid(),p_user_id);
 if result is not null then return result;end if;
 insert into public.chat_direct_links(a,b) values(least(auth.uid(),p_user_id),greatest(auth.uid(),p_user_id)) on conflict do nothing;
 return public.chat_start_v2(p_user_id,'direct');
end $$;
revoke all on function public.chat_discovery_save(boolean),public.chat_discovery_status(),public.chat_username_lookup(text),public.chat_username_start(uuid),public.chat_link_active_v2(uuid,uuid,text),public.chat_link_active_before_direct(uuid,uuid,text) from public,anon,authenticated;
grant execute on function public.chat_discovery_save(boolean),public.chat_discovery_status(),public.chat_username_lookup(text),public.chat_username_start(uuid) to authenticated;
commit;
