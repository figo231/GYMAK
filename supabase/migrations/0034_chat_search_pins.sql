begin;
create table public.chat_personal_pins (
 user_id uuid not null references auth.users(id) on delete cascade,
 message_id uuid not null references public.chat_messages(id) on delete cascade,
 created_at timestamptz not null default now(),
 primary key(user_id,message_id)
);
alter table public.chat_personal_pins enable row level security;
revoke all on public.chat_personal_pins from public,anon,authenticated;
grant all on public.chat_personal_pins to service_role;
create function public.care_chat_search(p_thread uuid,p_query text,p_before bigint default null) returns setof public.chat_messages
language plpgsql stable security definer set search_path='' as $$
begin
 perform public.care_thread_access(p_thread);
 if p_query is null or char_length(btrim(p_query)) not between 1 and 100 then raise exception 'invalid_search'; end if;
 return query select m.* from public.chat_messages m where m.conversation_id=p_thread and position(lower(btrim(p_query)) in lower(m.body))>0 and (p_before is null or m.seq<p_before) order by m.seq desc limit 50;
end $$;
create function public.care_chat_pins(p_thread uuid) returns setof public.chat_messages
language plpgsql stable security definer set search_path='' as $$
begin
 perform public.care_thread_access(p_thread);
 return query select m.* from public.chat_messages m join public.chat_personal_pins p on p.message_id=m.id where m.conversation_id=p_thread and p.user_id=auth.uid() order by p.created_at desc,m.seq desc;
end $$;
create function public.care_chat_pin(p_thread uuid,p_message uuid,p_pin boolean) returns void
language plpgsql security definer set search_path='' as $$
begin
 perform public.care_thread_access(p_thread);
 if p_pin is null or not exists(select 1 from public.chat_messages where id=p_message and conversation_id=p_thread) then raise exception 'message_not_allowed'; end if;
 perform pg_advisory_xact_lock(hashtext(auth.uid()::text));
 if p_pin then
  if (select count(*) from public.chat_personal_pins p join public.chat_messages m on m.id=p.message_id where p.user_id=auth.uid() and m.conversation_id=p_thread)>=30 and not exists(select 1 from public.chat_personal_pins where user_id=auth.uid() and message_id=p_message) then raise exception 'pin_limit'; end if;
  insert into public.chat_personal_pins(user_id,message_id) values(auth.uid(),p_message) on conflict do nothing;
 else delete from public.chat_personal_pins where user_id=auth.uid() and message_id=p_message;
 end if;
end $$;
revoke all on function public.care_chat_search(uuid,text,bigint),public.care_chat_pins(uuid),public.care_chat_pin(uuid,uuid,boolean) from public,anon,authenticated;
grant execute on function public.care_chat_search(uuid,text,bigint),public.care_chat_pins(uuid),public.care_chat_pin(uuid,uuid,boolean) to authenticated;
commit;
