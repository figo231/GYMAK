-- Exact username discovery does not require the target to accept chat terms.
-- Caller consent, exact matching, blocks and probe limits remain. Sending rules unchanged.
begin;
create or replace function public.chat_username_lookup(p_username text) returns jsonb language plpgsql security definer set search_path='' as $$
declare n integer;u uuid;begin
 if auth.uid() is null then raise exception 'not_authenticated' using errcode='42501';end if;
 if not public.chat_has_consent_v2() then raise exception 'consent_required' using errcode='42501';end if;
 if p_username is null or char_length(btrim(p_username)) not between 3 and 40 then raise exception 'invalid_username';end if;
 insert into public.chat_lookup_limits(user_id,hits) values(auth.uid(),1) on conflict(user_id) do update set hits=case when public.chat_lookup_limits.window_at<now()-interval '1 minute' then 1 else public.chat_lookup_limits.hits+1 end,window_at=case when public.chat_lookup_limits.window_at<now()-interval '1 minute' then now() else public.chat_lookup_limits.window_at end returning hits into n;
 if n>15 then return jsonb_build_object('limited',true);end if;
 select p.id into u from public.profiles p 
 where lower(p.username)=lower(ltrim(btrim(p_username),'@')) and p.id<>auth.uid() and not public.chat_blocked_between(auth.uid(),p.id) order by p.id limit 1;
 if u is null then return null;end if;
 return jsonb_build_object('user_id',u,'username',(select username from public.profiles where id=u),'label',coalesce((select nullif(display_name,'') from public.chat_profiles where user_id=u and visible),(select username from public.profiles where id=u)),'verified',exists(select 1 from public.chat_verifications where user_id=u) or exists(select 1 from public.admin_users where user_id=u and role='super_admin'));
end $$;
commit;
