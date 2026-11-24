begin;
create table public.care_slots (
 id uuid primary key default gen_random_uuid(),
 professional_id uuid not null references auth.users(id) on delete cascade,
 starts_at timestamptz not null,
 minutes integer not null check(minutes in (15,30,45,60)),
 note text not null default '' check(char_length(note)<=200),
 canceled boolean not null default false,
 created_at timestamptz not null default now()
);
create table public.care_appointments (
 id uuid primary key default gen_random_uuid(),
 slot_id uuid not null references public.care_slots(id) on delete cascade,
 conversation_id uuid not null references public.chat_conversations(id) on delete cascade,
 client_id uuid not null references auth.users(id) on delete cascade,
 status text not null default 'pending' check(status in ('pending','accepted','declined','canceled')),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
create unique index care_one_active_request on public.care_appointments(slot_id) where status in ('pending','accepted');
create index care_slots_pro_start on public.care_slots(professional_id,starts_at);
alter table public.care_slots enable row level security;
alter table public.care_appointments enable row level security;
revoke all on public.care_slots,public.care_appointments from public,anon,authenticated;
grant all on public.care_slots,public.care_appointments to service_role;
-- Appointment history/cancellation remains available after blocking or revocation.
create function public.care_appointment_thread(p_thread uuid) returns public.chat_conversations
language plpgsql stable security definer set search_path='' as $$
declare c public.chat_conversations;
begin
 if auth.uid() is null or not public.chat_has_consent_v2() then raise exception 'consent_required' using errcode='42501'; end if;
 select * into c from public.chat_conversations where id=p_thread and auth.uid() in(client_id,professional_id);
 if not found then raise exception 'chat_not_allowed' using errcode='42501'; end if;
 return c;
end $$;
revoke all on function public.care_appointment_thread(uuid) from public,anon,authenticated;
create function public.care_slot_add(p_thread uuid,p_start timestamptz,p_minutes integer,p_note text,p_request uuid) returns uuid
language plpgsql security definer set search_path='' as $$
declare c public.chat_conversations; old public.care_slots;
begin
 c:=public.care_thread_access(p_thread,true);
 if auth.uid()<>c.professional_id then raise exception 'professional_only'; end if;
 if p_request is null or p_start is null or p_minutes is null or p_minutes not in (15,30,45,60) or p_start<now()+interval '5 minutes' or p_start>now()+interval '90 days' or p_note is null or char_length(p_note)>200 then raise exception 'invalid_slot'; end if;
 perform pg_advisory_xact_lock(hashtext(c.professional_id::text));
 select * into old from public.care_slots where id=p_request;
 if found then
  if old.professional_id<>auth.uid() or old.starts_at<>p_start or old.minutes<>p_minutes or old.note<>p_note then raise exception 'idempotency_conflict'; end if;
  return old.id;
 end if;
 if (select count(*) from public.care_slots where professional_id=auth.uid() and starts_at>now() and not canceled)>=100 then raise exception 'slot_limit'; end if;
 if exists(select 1 from public.care_slots s where s.professional_id=auth.uid() and not canceled and tstzrange(s.starts_at,s.starts_at+make_interval(mins=>s.minutes),'[)') && tstzrange(p_start,p_start+make_interval(mins=>p_minutes),'[)')) then raise exception 'slot_overlap'; end if;
 insert into public.care_slots(id,professional_id,starts_at,minutes,note) values(p_request,auth.uid(),p_start,p_minutes,p_note);
 return p_request;
end $$;
create function public.care_appointments_list(p_thread uuid) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare c public.chat_conversations;
begin
 c:=public.care_appointment_thread(p_thread);
 return jsonb_build_object('is_professional',auth.uid()=c.professional_id,
 'slots',coalesce((select jsonb_agg(to_jsonb(s) order by s.starts_at) from (select s.id,s.starts_at,s.minutes,s.note from public.care_slots s where s.professional_id=c.professional_id and not s.canceled and s.starts_at>now() and not exists(select 1 from public.care_appointments a where a.slot_id=s.id and a.status in ('pending','accepted')) order by s.starts_at limit 100) s),'[]'::jsonb),
 'appointments',coalesce((select jsonb_agg(to_jsonb(a) order by a.starts_at desc) from (select a.id,a.slot_id,a.status,a.created_at,s.starts_at,s.minutes,s.note from public.care_appointments a join public.care_slots s on s.id=a.slot_id where a.conversation_id=p_thread order by s.starts_at desc limit 100) a),'[]'::jsonb));
end $$;
create function public.care_appointment_request(p_thread uuid,p_slot uuid,p_request uuid) returns uuid
language plpgsql security definer set search_path='' as $$
declare c public.chat_conversations; s public.care_slots; a public.care_appointments;
begin
 c:=public.care_thread_access(p_thread,true);
 if auth.uid()<>c.client_id or p_request is null then raise exception 'client_only'; end if;
 perform pg_advisory_xact_lock(hashtext(c.professional_id::text));
 select * into a from public.care_appointments where id=p_request;
 if found then
  if a.conversation_id<>p_thread or a.slot_id<>p_slot or a.client_id<>auth.uid() then raise exception 'idempotency_conflict'; end if;
  return a.id;
 end if;
 select * into s from public.care_slots where id=p_slot and professional_id=c.professional_id and not canceled and starts_at>now() for update;
 if not found or exists(select 1 from public.care_appointments where slot_id=p_slot and status in ('pending','accepted')) then raise exception 'slot_unavailable'; end if;
 if (select count(*) from public.care_appointments where client_id=auth.uid() and status='pending')>=5 then raise exception 'pending_limit'; end if;
 if exists(select 1 from public.care_appointments where conversation_id=p_thread and slot_id=p_slot and status='declined') then raise exception 'request_closed'; end if;
 insert into public.care_appointments(id,slot_id,conversation_id,client_id) values(p_request,p_slot,p_thread,auth.uid());return p_request;
end $$;
create function public.care_appointment_answer(p_thread uuid,p_id uuid,p_action text) returns void
language plpgsql security definer set search_path='' as $$
declare c public.chat_conversations; a public.care_appointments; s public.care_slots;
begin
 if p_action='cancel' then c:=public.care_appointment_thread(p_thread); else c:=public.care_thread_access(p_thread,true); end if;
 perform pg_advisory_xact_lock(hashtext(c.professional_id::text));
 select * into a from public.care_appointments where id=p_id and conversation_id=p_thread for update;
 if not found or p_action is null then raise exception 'request_not_allowed'; end if;
 select * into s from public.care_slots where id=a.slot_id;
 if p_action='cancel' then
  if a.status='canceled' then return; end if;
  if a.status not in ('pending','accepted') then raise exception 'request_closed'; end if;
  update public.care_appointments set status='canceled',updated_at=now() where id=p_id;
 elsif p_action in ('accept','decline') and auth.uid()=c.professional_id and s.starts_at>now() and not s.canceled then
  if a.status=(case when p_action='accept' then 'accepted' else 'declined' end) then return; end if;
  if a.status<>'pending' then raise exception 'request_closed'; end if;
  if p_action='accept' then
   perform pg_advisory_xact_lock(hashtext(a.client_id::text));
   if exists(select 1 from public.care_appointments x join public.care_slots y on y.id=x.slot_id where x.client_id=a.client_id and x.id<>a.id and x.status='accepted' and not y.canceled and tstzrange(y.starts_at,y.starts_at+make_interval(mins=>y.minutes),'[)') && tstzrange(s.starts_at,s.starts_at+make_interval(mins=>s.minutes),'[)')) then raise exception 'client_time_conflict'; end if;
  end if;
  update public.care_appointments set status=case when p_action='accept' then 'accepted' else 'declined' end,updated_at=now() where id=p_id;
 else raise exception 'request_not_allowed'; end if;
end $$;
create function public.care_slot_cancel(p_thread uuid,p_slot uuid) returns void
language plpgsql security definer set search_path='' as $$
declare c public.chat_conversations;
begin
 c:=public.care_appointment_thread(p_thread);
 if auth.uid()<>c.professional_id then raise exception 'professional_only'; end if;
 perform pg_advisory_xact_lock(hashtext(c.professional_id::text));
 if not exists(select 1 from public.care_slots where id=p_slot and professional_id=auth.uid()) then raise exception 'slot_unavailable'; end if;
 update public.care_slots set canceled=true where id=p_slot;
 update public.care_appointments set status='canceled',updated_at=now() where slot_id=p_slot and status in ('pending','accepted');
end $$;
revoke all on function public.care_slot_add(uuid,timestamptz,integer,text,uuid),public.care_appointments_list(uuid),public.care_appointment_request(uuid,uuid,uuid),public.care_appointment_answer(uuid,uuid,text),public.care_slot_cancel(uuid,uuid) from public,anon,authenticated;
grant execute on function public.care_slot_add(uuid,timestamptz,integer,text,uuid),public.care_appointments_list(uuid),public.care_appointment_request(uuid,uuid,uuid),public.care_appointment_answer(uuid,uuid,text),public.care_slot_cancel(uuid,uuid) to authenticated;
commit;
