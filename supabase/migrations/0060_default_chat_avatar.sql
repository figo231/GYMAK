-- Unset chat profiles start visible. Every existing stored choice, including false, is retained.
begin;
create or replace function public.chat_profile_get(p_user_id uuid) returns jsonb language plpgsql stable security definer set search_path='' as $$
declare p public.chat_profiles;dev boolean;v boolean;begin
 if auth.uid() is null then raise exception 'not_authenticated' using errcode='42501';end if;
 select * into p from public.chat_profiles where user_id=p_user_id;
 select exists(select 1 from public.admin_users where user_id=p_user_id and role='super_admin') into dev;
 select exists(select 1 from public.chat_verifications where user_id=p_user_id) into v;
 if p_user_id=auth.uid() then return jsonb_build_object('profile_exists',p.user_id is not null,'user_id',p_user_id,'display_name',coalesce(p.display_name,''),'bio',coalesce(p.bio,''),'avatar_path',p.avatar_path,'visible',coalesce(p.visible,true),'read_receipts',coalesce(p.read_receipts,true),'verified',v or dev,'is_developer',dev,'role',public.chat_role_for(p_user_id));end if;
 if public.chat_blocked_between(auth.uid(),p_user_id) or not exists(select 1 from auth.users where id=p_user_id) or (not coalesce(p.visible,false) and not dev and not exists(select 1 from public.chat_conversations c where auth.uid() in(c.client_id,c.professional_id) and p_user_id in(c.client_id,c.professional_id))) then raise exception 'profile_unavailable';end if;
 return jsonb_build_object('user_id',p_user_id,'display_name',case when p.visible then p.display_name when dev then 'مطور GYMAK' else coalesce((select coalesce(nullif(name,''),nullif(username,'')) from public.profiles where id=p_user_id),'مستخدم') end,'bio',case when p.visible then p.bio else '' end,'avatar_path',case when p.visible then p.avatar_path else null end,'visible',coalesce(p.visible,false),'verified',v or dev,'is_developer',dev,'role',public.chat_role_for(p_user_id));
end $$;
create function public.chat_default_avatar(p_avatar text) returns boolean language plpgsql security definer set search_path='' as $$
declare n integer;begin
 if auth.uid() is null then raise exception 'not_authenticated' using errcode='42501';end if;
 if p_avatar is null or p_avatar<>auth.uid()::text||'/chat-avatar.jpg' then raise exception 'invalid_avatar';end if;
 insert into public.chat_profiles(user_id,display_name,bio,avatar_path,visible,read_receipts)
 select auth.uid(),left(coalesce(nullif(btrim(p.name),''),nullif(btrim(p.username),''),'مستخدم'),80),'',p_avatar,true,true from public.profiles p where p.id=auth.uid()
 on conflict(user_id) do update set avatar_path=excluded.avatar_path,updated_at=now() where public.chat_profiles.visible and public.chat_profiles.avatar_path is null;
 get diagnostics n=row_count;return n=1;
end $$;
revoke all on function public.chat_default_avatar(text) from public,anon,authenticated;
grant execute on function public.chat_default_avatar(text) to authenticated;
commit;
