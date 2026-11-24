begin;
create table public.care_training_versions (
 id uuid primary key default gen_random_uuid(),conversation_id uuid not null references public.chat_conversations(id) on delete cascade,
 author_id uuid not null references auth.users(id) on delete cascade,version integer not null,
 snapshot jsonb not null,change_note text not null default '' check(char_length(change_note)<=300),created_at timestamptz not null default now(),unique(conversation_id,version)
);
alter table public.care_training_versions enable row level security;
revoke all on public.care_training_versions from public,anon,authenticated;
grant all on public.care_training_versions to service_role;
create function public.care_training_list(p_thread uuid) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare c public.chat_conversations;
begin
 c:=public.care_thread_access(p_thread);
 return jsonb_build_object('can_author',c.professional_id=auth.uid() and c.kind='coach' and public.chat_link_active_v2(c.client_id,c.professional_id,c.kind),'is_client',c.client_id=auth.uid(),
 'versions',coalesce((select jsonb_agg(to_jsonb(v) order by version desc) from (select * from public.care_training_versions where conversation_id=p_thread order by version desc limit 100) v),'[]'::jsonb));
end $$;
create function public.care_training_save(p_thread uuid,p_snapshot jsonb,p_note text,p_request uuid,p_expected_version integer) returns uuid
language plpgsql security definer set search_path='' as $$
declare c public.chat_conversations; old public.care_training_versions; n integer; day jsonb; ex jsonb;
begin
 c:=public.care_thread_access(p_thread,true);
 if c.professional_id<>auth.uid() or c.kind<>'coach' then raise exception 'coach_only'; end if;
 if p_request is null or p_note is null or char_length(p_note)>300 or p_snapshot is null or octet_length(p_snapshot::text)>50000 or jsonb_typeof(p_snapshot)<>'object' or jsonb_typeof(p_snapshot->'name') is distinct from 'string' or char_length(btrim(p_snapshot->>'name')) not between 1 and 100 or jsonb_typeof(p_snapshot->'days') is distinct from 'array' then raise exception 'invalid_plan'; end if;
 if jsonb_array_length(p_snapshot->'days') not between 1 and 7 then raise exception 'invalid_plan'; end if;
 for day in select value from jsonb_array_elements(p_snapshot->'days') loop
  if jsonb_typeof(day->'title') is distinct from 'string' or char_length(day->>'title') not between 1 and 100 or jsonb_typeof(day->'exercises') is distinct from 'array' then raise exception 'invalid_plan'; end if;
  if jsonb_array_length(day->'exercises') not between 1 and 30 then raise exception 'invalid_plan'; end if;
  for ex in select value from jsonb_array_elements(day->'exercises') loop
   if jsonb_typeof(ex->'id') is distinct from 'string' or char_length(ex->>'id') not between 1 and 120 or jsonb_typeof(ex->'name') is distinct from 'string' or char_length(ex->>'name') not between 1 and 100 then raise exception 'invalid_plan'; end if;
   if jsonb_typeof(ex->'sets') is distinct from 'number' or jsonb_typeof(ex->'reps') is distinct from 'number' then raise exception 'invalid_plan'; end if;
   if (ex->>'sets')::numeric not between 1 and 50 or (ex->>'reps')::numeric not between 1 and 1000 or (ex->>'sets')::numeric<>trunc((ex->>'sets')::numeric) or (ex->>'reps')::numeric<>trunc((ex->>'reps')::numeric) or coalesce(ex->>'unit','reps') not in ('reps','sec') then raise exception 'invalid_plan'; end if;
  end loop;
 end loop;
 perform pg_advisory_xact_lock(hashtext(p_thread::text));
 select * into old from public.care_training_versions where id=p_request;
 if found then
  if old.conversation_id<>p_thread or old.author_id<>auth.uid() or old.snapshot<>p_snapshot or old.change_note<>p_note then raise exception 'idempotency_conflict'; end if;return old.id;
 end if;
 select coalesce(max(version),0) into n from public.care_training_versions where conversation_id=p_thread;
 if p_expected_version is null or p_expected_version<>n then raise exception 'plan_changed_refresh'; end if;
 if n>=100 then raise exception 'plan_version_limit'; end if;
 insert into public.care_training_versions(id,conversation_id,author_id,version,snapshot,change_note) values(p_request,p_thread,auth.uid(),n+1,p_snapshot,p_note);return p_request;
end $$;
revoke all on function public.care_training_list(uuid),public.care_training_save(uuid,jsonb,text,uuid,integer) from public,anon,authenticated;
grant execute on function public.care_training_list(uuid),public.care_training_save(uuid,jsonb,text,uuid,integer) to authenticated;
commit;
