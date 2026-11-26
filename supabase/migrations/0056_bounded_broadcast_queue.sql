-- Preparation only. Replaces unbounded topic sends with durable owned-token rows.
begin;
alter table public.notification_deliveries drop constraint if exists notification_deliveries_status_check;
alter table public.notification_deliveries add constraint notification_deliveries_status_check check(status in('pending','dispatching','sent','failed_temporary','failed_permanent','invalid_token','outcome_unknown'));
alter table public.notification_deliveries add column if not exists claimed_at timestamptz;
create function public.enqueue_broadcast_devices_v1(p_notification uuid) returns integer language plpgsql security definer set search_path='' as $$
declare n public.notifications;total integer;
begin
 select * into n from public.notifications where id=p_notification for update;
 if not found or n.status<>'sending' then raise exception 'notification_not_sending';end if;
 if n.audience_type<>'everyone' and not(n.audience_type='topic' and n.audience_ref->>'topic'='all_users') then raise exception 'unsupported_broadcast_audience';end if;
 insert into public.notification_deliveries(notification_id,token_id,status)
 select n.id,t.id,'pending' from public.push_tokens t where t.is_active and t.user_id is not null
 and not exists(select 1 from public.push_preferences p where p.user_id=t.user_id and p.category in('master',n.category) and p.enabled=false)
 on conflict(notification_id,token_id) do nothing;
 get diagnostics total=row_count;
 if not exists(select 1 from public.notification_deliveries where notification_id=n.id) then update public.notifications set status='sent',sent_at=now() where id=n.id;end if;
 return total;
end $$;
create or replace function public.claim_pending_deliveries(p_notification_id uuid,p_batch_size int) returns setof public.notification_deliveries language plpgsql security definer set search_path='' as $$
begin
 -- A dead worker may have sent before losing its acknowledgement. Never resend blindly.
 update public.notification_deliveries set status='outcome_unknown',error_code='worker_claim_expired' where status='dispatching' and claimed_at<now()-interval '5 minutes';
 return query update public.notification_deliveries d set status='dispatching',claimed_at=now()
 from(select x.id from public.notification_deliveries x join public.notifications n on n.id=x.notification_id where x.notification_id=p_notification_id and x.status='pending' and n.status='sending' order by x.created_at limit least(greatest(p_batch_size,0),50) for update of x skip locked) c where d.id=c.id returning d.*;
end $$;
create or replace function public.claim_due_retries(p_batch_size int) returns setof public.notification_deliveries language plpgsql security definer set search_path='' as $$
begin
 -- A dead worker may have sent before losing its acknowledgement. Never resend blindly.
 update public.notification_deliveries set status='outcome_unknown',error_code='worker_claim_expired' where status='dispatching' and claimed_at<now()-interval '5 minutes';
 return query update public.notification_deliveries d set status='dispatching',claimed_at=now()
 from(select x.id from public.notification_deliveries x join public.notifications n on n.id=x.notification_id where x.status='failed_temporary' and x.next_retry_at<=now() and n.status='sending' order by x.next_retry_at limit least(greatest(p_batch_size,0),50) for update of x skip locked) c where d.id=c.id returning d.*;
end $$;
revoke all on function public.enqueue_broadcast_devices_v1(uuid),public.claim_pending_deliveries(uuid,int),public.claim_due_retries(int) from public,anon,authenticated;
grant execute on function public.enqueue_broadcast_devices_v1(uuid),public.claim_pending_deliveries(uuid,int),public.claim_due_retries(int) to service_role;
create function public.next_broadcast_notification_v1() returns setof public.notifications language plpgsql security definer set search_path='' as $$
begin
 update public.notification_deliveries set status='outcome_unknown',error_code='worker_claim_expired' where status='dispatching' and claimed_at<now()-interval '5 minutes';
 update public.notifications n set status=case when exists(select 1 from public.notification_deliveries d where d.notification_id=n.id and d.status in('failed_permanent','invalid_token','outcome_unknown')) then 'failed' else 'sent' end,sent_at=now()
 where n.status='sending' and not exists(select 1 from public.notification_deliveries d where d.notification_id=n.id and d.status in('pending','dispatching','failed_temporary'));
 return query select n.* from public.notifications n where n.status='sending' and exists(select 1 from public.notification_deliveries d where d.notification_id=n.id and d.status='pending') order by n.created_at,n.id limit 1;
end $$;
revoke all on function public.next_broadcast_notification_v1() from public,anon,authenticated;
grant execute on function public.next_broadcast_notification_v1() to service_role;
notify pgrst,'reload schema';
commit;
