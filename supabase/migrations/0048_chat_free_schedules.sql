-- Free provider-native schedules. Dedicated secrets are provisioned separately.
begin;
create extension if not exists pg_cron;
create extension if not exists pg_net;
create function public.chat_dispatch_wake_v1() returns void language plpgsql security definer set search_path='' as $$
declare secret text;
begin
 if not exists(select 1 from public.chat_push_control where id and enabled) then return;end if;
 if not exists(select 1 from public.chat_push_queue where state='pending') then return;end if;
 select decrypted_secret into secret from vault.decrypted_secrets where name='gymak_chat_push_dispatch' limit 1;
 if secret is null then return;end if;
 perform net.http_post(url:='https://ybkeshztehjeoeonpkih.supabase.co/functions/v1/dispatch-chat-push',headers:=jsonb_build_object('Content-Type','application/json','x-chat-push-secret',secret),body:='{}'::jsonb,timeout_milliseconds:=10000);
exception when others then
 -- Do not fail chat sends if a wake cannot be queued. The minute sweep recovers.
 raise warning 'chat_dispatch_wake_failed';
end $$;
create function public.chat_queue_wake_v1() returns trigger language plpgsql security definer set search_path='' as $$begin perform public.chat_dispatch_wake_v1();return null;end $$;
create trigger chat_queue_wake_v1 after insert on public.chat_push_queue for each statement execute function public.chat_queue_wake_v1();
create function public.chat_cleanup_wake_v1() returns void language plpgsql security definer set search_path='' as $$
declare secret text;
begin
 select decrypted_secret into secret from vault.decrypted_secrets where name='gymak_chat_photo_cleanup' limit 1;
 if secret is null then raise exception 'cleanup_secret_missing';end if;
 perform net.http_post(url:='https://ybkeshztehjeoeonpkih.supabase.co/functions/v1/chat-photo',headers:=jsonb_build_object('Content-Type','application/json','x-photo-action','cleanup','x-chat-photo-cleanup-secret',secret),body:='{}'::jsonb,timeout_milliseconds:=10000);
end $$;
revoke all on function public.chat_dispatch_wake_v1(),public.chat_queue_wake_v1(),public.chat_cleanup_wake_v1() from public,anon,authenticated;
-- Each minute recovers failed wake requests and continues queues larger than50.
-- It sends no HTTP request when no pending rows exist. Never retries unknowns.
select cron.schedule('gymak-chat-push-sweep','* * * * *','select public.chat_dispatch_wake_v1()');
select cron.schedule('gymak-chat-photo-expiry','23 * * * *','select public.chat_cleanup_wake_v1()');
commit;
