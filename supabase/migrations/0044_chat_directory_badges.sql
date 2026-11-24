begin;
-- Keep the existing directory's publication and pagination rules intact.
create function public.professional_directory_v2(p_kind text default 'all',p_after_id uuid default null) returns jsonb language sql stable security definer set search_path='' as $$select coalesce(jsonb_agg(to_jsonb(d)||jsonb_build_object('verified',exists(select 1 from public.chat_verifications v where v.user_id=d.user_id))), '[]'::jsonb) from public.professional_directory(p_kind,p_after_id) d$$;
revoke all on function public.professional_directory_v2(text,uuid) from public,anon,authenticated;grant execute on function public.professional_directory_v2(text,uuid) to anon,authenticated;
commit;
