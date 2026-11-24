-- Structured nutrition plans. Additive, private to existing chat participants.
begin;
create table public.care_plan_versions (
 id uuid primary key default gen_random_uuid(),
 conversation_id uuid not null references public.chat_conversations(id) on delete cascade,
 author_id uuid not null references auth.users(id) on delete cascade,
 version integer not null,
 title text not null check(char_length(title) between 1 and 100),
 meals jsonb not null check(jsonb_typeof(meals)='array' and jsonb_array_length(meals) between 1 and 12),
 note text not null default '' check(char_length(note)<=800),
 change_note text not null default '' check(char_length(change_note)<=300),
 created_at timestamptz not null default now(),
 unique(conversation_id,version)
);
create table public.care_plan_choices (
 conversation_id uuid primary key references public.chat_conversations(id) on delete cascade,
 version_id uuid not null references public.care_plan_versions(id) on delete cascade,
 client_id uuid not null references auth.users(id) on delete cascade,
 updated_at timestamptz not null default now()
);
alter table public.care_plan_versions enable row level security;
alter table public.care_plan_choices enable row level security;
revoke all on public.care_plan_versions,public.care_plan_choices from public,anon,authenticated;
grant all on public.care_plan_versions,public.care_plan_choices to service_role;

create function public.care_thread_access(p_thread uuid,p_write boolean default false) returns public.chat_conversations
language plpgsql stable security definer set search_path='' as $$
declare c public.chat_conversations;
begin
 if auth.uid() is null or not public.chat_has_consent_v2() then raise exception 'consent_required' using errcode='42501'; end if;
 select * into c from public.chat_conversations where id=p_thread and auth.uid() in (client_id,professional_id);
 if not found then raise exception 'chat_not_allowed' using errcode='42501'; end if;
 if public.chat_blocked_between(c.client_id,c.professional_id) then raise exception 'chat_blocked' using errcode='42501'; end if;
 if p_write and not exists(select 1 from public.apk18_rollout_control where id and chat_writes) then raise exception 'chat_paused' using errcode='42501'; end if;
 if p_write and not public.chat_link_active_v2(c.client_id,c.professional_id,c.kind) then raise exception 'chat_read_only' using errcode='42501'; end if;
 return c;
end $$;
create function public.care_plan_list(p_thread uuid) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare c public.chat_conversations;
begin
 c:=public.care_thread_access(p_thread);
 return jsonb_build_object('can_author',c.professional_id=auth.uid() and c.kind='doctor' and public.chat_link_active_v2(c.client_id,c.professional_id,c.kind),
 'is_client',c.client_id=auth.uid(),'selected_id',(select version_id from public.care_plan_choices where conversation_id=p_thread),
 'versions',coalesce((select jsonb_agg(to_jsonb(v) order by version desc) from (select * from public.care_plan_versions where conversation_id=p_thread order by version desc limit 100) v),'[]'::jsonb));
end $$;
create function public.care_plan_save(p_thread uuid,p_title text,p_meals jsonb,p_note text,p_change_note text,p_request uuid,p_expected_version integer) returns uuid
language plpgsql security definer set search_path='' as $$
declare c public.chat_conversations; n integer; item jsonb; existing public.care_plan_versions;
begin
 c:=public.care_thread_access(p_thread,true);
 if c.professional_id<>auth.uid() or c.kind<>'doctor' then raise exception 'doctor_only' using errcode='42501'; end if;
 if p_request is null or p_title is null or char_length(btrim(p_title)) not between 1 and 100 or p_note is null or char_length(p_note)>800 or p_change_note is null or char_length(p_change_note)>300 or p_meals is null or octet_length(p_meals::text)>25000 or jsonb_typeof(p_meals)<>'array' then raise exception 'invalid_plan'; end if;
 if jsonb_array_length(p_meals) not between 1 and 12 then raise exception 'invalid_plan'; end if;
 for item in select value from jsonb_array_elements(p_meals) loop
  if jsonb_typeof(item)<>'object' or jsonb_typeof(item->'name') is distinct from 'string' or jsonb_typeof(item->'items') is distinct from 'string' or char_length(btrim(item->>'name')) not between 1 and 60 or char_length(btrim(item->>'items')) not between 1 and 600 then raise exception 'invalid_plan'; end if;
 end loop;
 perform pg_advisory_xact_lock(hashtext(p_thread::text));
 select * into existing from public.care_plan_versions where id=p_request;
 if found then
  if existing.conversation_id<>p_thread or existing.author_id<>auth.uid() or existing.title<>btrim(p_title) or existing.meals<>p_meals or existing.note<>p_note or existing.change_note<>p_change_note then raise exception 'idempotency_conflict'; end if;
  return existing.id;
 end if;
 select coalesce(max(version),0) into n from public.care_plan_versions where conversation_id=p_thread;
 if p_expected_version is null or n<>p_expected_version then raise exception 'plan_changed_refresh'; end if;
 if n>=100 then raise exception 'plan_version_limit'; end if;
 insert into public.care_plan_versions(id,conversation_id,author_id,version,title,meals,note,change_note) values(p_request,p_thread,auth.uid(),n+1,btrim(p_title),p_meals,p_note,p_change_note);
 return p_request;
end $$;
create function public.care_plan_choose(p_thread uuid,p_version uuid) returns void
language plpgsql security definer set search_path='' as $$
declare c public.chat_conversations;
begin
 c:=public.care_thread_access(p_thread,true);
 if c.client_id<>auth.uid() or not exists(select 1 from public.care_plan_versions where id=p_version and conversation_id=p_thread) then raise exception 'plan_not_allowed' using errcode='42501'; end if;
 insert into public.care_plan_choices(conversation_id,version_id,client_id) values(p_thread,p_version,auth.uid()) on conflict(conversation_id) do update set version_id=excluded.version_id,updated_at=now();
end $$;
revoke all on function public.care_thread_access(uuid,boolean),public.care_plan_list(uuid),public.care_plan_save(uuid,text,jsonb,text,text,uuid,integer),public.care_plan_choose(uuid,uuid) from public,anon,authenticated;
grant execute on function public.care_plan_list(uuid),public.care_plan_save(uuid,text,jsonb,text,text,uuid,integer),public.care_plan_choose(uuid,uuid) to authenticated;
commit;
