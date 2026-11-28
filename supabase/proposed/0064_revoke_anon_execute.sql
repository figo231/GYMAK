-- PROPOSED, NOT APPLIED. Lives outside supabase/migrations on purpose so no tool applies it by accident.
-- Removes EXECUTE from anon (and PUBLIC, which anon inherits) on the nine public functions that anon can run today.
-- Evidence (live catalog read, 2026-11-27): every RLS policy that calls these functions is TO authenticated only.
-- RPC functions keep authenticated + service_role. Trigger functions are never called through the API.
begin;
-- apk18_capabilities keeps anon on purpose (0031 grants it; flags only, nothing private).
revoke all on function public.apk18_capabilities() from public;
revoke all on function public.coach_can_see(uuid) from public, anon;
revoke all on function public.is_coach(uuid) from public, anon;
revoke all on function public.professional_directory(text, uuid) from public, anon;
revoke all on function public.professional_directory_v2(text, uuid) from public, anon;
grant execute on function public.apk18_capabilities() to anon, authenticated, service_role;
grant execute on function public.coach_can_see(uuid) to authenticated, service_role;
grant execute on function public.is_coach(uuid) to authenticated, service_role;
grant execute on function public.professional_directory(text, uuid) to authenticated, service_role;
grant execute on function public.professional_directory_v2(text, uuid) to authenticated, service_role;
-- Trigger / event-trigger functions: not meant to be callable by any API role.
revoke all on function public.feedback_rate_limit() from public, anon, authenticated;
revoke all on function public.handle_new_user() from public, anon, authenticated;
revoke all on function public.touch_updated_at() from public, anon, authenticated;
do $$ begin if to_regprocedure('public.rls_auto_enable()') is not null then revoke all on function public.rls_auto_enable() from public, anon, authenticated; end if; end $$; -- platform-created, not in repo migrations
notify pgrst, 'reload schema';
commit;
-- ROLLBACK (also not applied): grant execute on all nine functions back to anon, authenticated, service_role.
