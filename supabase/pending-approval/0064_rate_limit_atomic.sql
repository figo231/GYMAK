-- Atomic per-window counter: one statement, no read-then-write race.
create or replace function public.admin_rate_limit_hit(p_admin uuid, p_window timestamptz, p_max int)
returns table(allowed boolean, count int)
language plpgsql security definer set search_path = public as $$
declare c int;
begin
  insert into public.admin_rate_limits(admin_id, window_start, send_count)
  values (p_admin, p_window, 1)
  on conflict (admin_id, window_start)
  do update set send_count = public.admin_rate_limits.send_count + 1
  where public.admin_rate_limits.send_count < p_max
  returning send_count into c;
  if c is null then
    select send_count into c from public.admin_rate_limits where admin_id = p_admin and window_start = p_window;
    return query select false, coalesce(c, p_max);
    return;
  end if;
  return query select true, c;
end $$;
revoke all on function public.admin_rate_limit_hit(uuid, timestamptz, int) from public, anon, authenticated;
grant execute on function public.admin_rate_limit_hit(uuid, timestamptz, int) to service_role;
