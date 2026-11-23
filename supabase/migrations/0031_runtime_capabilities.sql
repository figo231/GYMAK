-- Additive runtime UI capability read. Does not change activation flags.
begin;
create function public.apk18_capabilities() returns jsonb language sql stable security definer set search_path='' as $$
 select jsonb_build_object('identity_signup',coalesce((select identity_signup from public.apk18_rollout_control where id),false),'chat_writes',coalesce((select chat_writes from public.apk18_rollout_control where id),false));
$$;
revoke all on function public.apk18_capabilities() from public,anon,authenticated;
grant execute on function public.apk18_capabilities() to anon,authenticated;
notify pgrst,'reload schema';
commit;
