-- Owner-approved exact username discovery. No email, phone or partial enumeration.
begin;
create or replace function public.chat_discovery_status() returns jsonb language sql stable security definer set search_path='' as $$select jsonb_build_object('enabled',true,'username',(select username from public.profiles where id=auth.uid())) where auth.uid() is not null$$;
create or replace function public.chat_username_lookup(p_username text) returns jsonb language plpgsql security definer set search_path='' as $$
declare n integer;u uuid;begin
 if auth.uid() is null then raise exception 'not_authenticated' using errcode='42501';end if;
 if not public.chat_has_consent_v2() then raise exception 'consent_required' using errcode='42501';end if;
 if p_username is null or char_length(btrim(p_username)) not between 3 and 40 then raise exception 'invalid_username';end if;
 insert into public.chat_lookup_limits(user_id,hits) values(auth.uid(),1) on conflict(user_id) do update set hits=case when public.chat_lookup_limits.window_at<now()-interval '1 minute' then 1 else public.chat_lookup_limits.hits+1 end,window_at=case when public.chat_lookup_limits.window_at<now()-interval '1 minute' then now() else public.chat_lookup_limits.window_at end returning hits into n;
 if n>15 then return jsonb_build_object('limited',true);end if;
 select p.id into u from public.profiles p 
 where lower(p.username)=lower(ltrim(btrim(p_username),'@')) and p.id<>auth.uid() and not public.chat_blocked_between(auth.uid(),p.id)
 and exists(select 1 from public.terms_acceptances t where t.user_id=p.id and t.version='2026-11-23-tou-v1') order by p.id limit 1;
 if u is null then return null;end if;
 return jsonb_build_object('user_id',u,'username',(select username from public.profiles where id=u),'label',coalesce((select nullif(display_name,'') from public.chat_profiles where user_id=u and visible),(select username from public.profiles where id=u)),'verified',exists(select 1 from public.chat_verifications where user_id=u) or exists(select 1 from public.admin_users where user_id=u and role='super_admin'));
end $$;
create or replace function public.chat_username_start(p_user_id uuid) returns uuid language plpgsql security definer set search_path='' as $$
declare result uuid;begin
 if auth.uid() is null then raise exception 'not_authenticated' using errcode='42501';end if;
 if not public.chat_has_consent_v2() then raise exception 'consent_required' using errcode='42501';end if;
 if p_user_id=auth.uid() or not exists(select 1 from public.profiles n where n.id=p_user_id and char_length(btrim(n.username))>=3) then raise exception 'chat_not_allowed' using errcode='42501';end if;
 if public.chat_blocked_between(auth.uid(),p_user_id) then raise exception 'chat_blocked' using errcode='42501';end if;
 perform pg_advisory_xact_lock(hashtext(least(auth.uid(),p_user_id)::text));
 select id into result from public.chat_conversations where kind='direct' and least(client_id,professional_id)=least(auth.uid(),p_user_id) and greatest(client_id,professional_id)=greatest(auth.uid(),p_user_id);
 if result is not null then return result;end if;
 insert into public.chat_direct_links(a,b) values(least(auth.uid(),p_user_id),greatest(auth.uid(),p_user_id)) on conflict do nothing;
 return public.chat_start_v2(p_user_id,'direct');
end $$;
create or replace function public.chat_discovery_save(p_enabled boolean) returns void language plpgsql security definer set search_path='' as $$begin
 if auth.uid() is null then raise exception 'not_authenticated' using errcode='42501';end if;
 -- Retained for older clients. Exact username discovery no longer depends on this flag.
 if p_enabled is null then raise exception 'invalid_preference';end if;
end $$;
commit;
