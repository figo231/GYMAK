-- APK25 chat push. REVIEW/STAGING ONLY. No existing object is replaced.
-- Must not be activated until dispatcher + authenticated end-to-end tests pass.
begin;
create table public.chat_push_control(id boolean primary key default true check(id),enabled boolean not null default false);
insert into public.chat_push_control values(true,false);
-- Account-scoped explicit opt-in. No row means generic notifications.
create table public.chat_push_preferences(user_id uuid primary key references auth.users(id) on delete cascade,show_preview boolean not null default false,updated_at timestamptz not null default now());
alter table public.chat_push_preferences enable row level security;
revoke all on public.chat_push_preferences from public,anon,authenticated;
grant all on public.chat_push_preferences to service_role;
create function public.chat_push_preference_v1() returns boolean language plpgsql stable security definer set search_path='' as $$begin
 if auth.uid() is null then raise exception 'not_authenticated';end if;
 return coalesce((select show_preview from public.chat_push_preferences where user_id=auth.uid()),false);
end $$;
create function public.chat_push_preference_save_v1(p_preview boolean,p_expected_user uuid) returns void language plpgsql security definer set search_path='' as $$begin
 if auth.uid() is null or auth.uid()<>p_expected_user then raise exception 'session_changed';end if;
 if p_preview is null then raise exception 'invalid_preference';end if;
 insert into public.chat_push_preferences(user_id,show_preview)values(auth.uid(),p_preview) on conflict(user_id)do update set show_preview=excluded.show_preview,updated_at=now();
end $$;
revoke all on function public.chat_push_preference_v1(),public.chat_push_preference_save_v1(boolean,uuid) from public,anon,authenticated;
grant execute on function public.chat_push_preference_v1(),public.chat_push_preference_save_v1(boolean,uuid) to authenticated;
create table public.chat_push_queue(
 id uuid primary key default gen_random_uuid(),
 message_id uuid not null references public.chat_messages(id) on delete cascade,
 recipient_id uuid not null references auth.users(id) on delete cascade,
 token_id uuid not null references public.push_tokens(id) on delete cascade,
 state text not null default 'pending' check(state in('pending','outcome_unknown','accepted','failed','invalid_token','skipped')),
 created_at timestamptz not null default now(),claimed_at timestamptz,finished_at timestamptz,
 provider_id text,error_code text,
 unique(message_id,token_id)
);
create index chat_push_pending on public.chat_push_queue(created_at) where state='pending';
alter table public.chat_push_control enable row level security;
alter table public.chat_push_queue enable row level security;
revoke all on public.chat_push_control,public.chat_push_queue from public,anon,authenticated;
grant all on public.chat_push_control,public.chat_push_queue to service_role;
create function public.chat_push_enqueue_v1() returns trigger language plpgsql security definer set search_path='' as $$
declare c public.chat_conversations; recipient uuid;
begin
 if not exists(select 1 from public.chat_push_control where id and enabled) then return new;end if;
 select * into c from public.chat_conversations where id=new.conversation_id;
 if new.author_id=c.client_id then recipient:=c.professional_id;
 elsif new.author_id=c.professional_id then recipient:=c.client_id;
 else return new;end if;
 if public.chat_blocked_between(new.author_id,recipient) then return new;end if;
 insert into public.chat_push_queue(message_id,recipient_id,token_id)
 select new.id,recipient,t.id from public.push_tokens t
 where t.user_id=recipient and t.is_active and t.platform='android' and t.last_seen>now()-interval '30 days'
 on conflict do nothing;
 return new;
end $$;
-- New trigger, disabled in effect by chat_push_control. No old trigger is edited.
create trigger chat_push_enqueue_v1 after insert on public.chat_messages for each row execute function public.chat_push_enqueue_v1();
create function public.chat_push_claim_v1() returns jsonb language plpgsql security definer set search_path='' as $$
declare q public.chat_push_queue; c public.chat_conversations; m public.chat_messages; t public.push_tokens; preview text;
begin
 if not exists(select 1 from public.chat_push_control where id and enabled) then return null;end if;
 select * into q from public.chat_push_queue where state='pending' order by created_at,id for update skip locked limit 1;
 if not found then return null;end if;
 select * into m from public.chat_messages where id=q.message_id;
 select * into c from public.chat_conversations where id=m.conversation_id;
 select * into t from public.push_tokens where id=q.token_id;
 if m.id is null or c.id is null or t.id is null or not t.is_active or t.user_id<>q.recipient_id
 or q.recipient_id not in(c.client_id,c.professional_id) or m.author_id=q.recipient_id
 or public.chat_blocked_between(m.author_id,q.recipient_id) or q.created_at<now()-interval '15 minutes'
 or t.last_seen<now()-interval '30 days' then
  update public.chat_push_queue set state='skipped',finished_at=now() where id=q.id;return jsonb_build_object('skipped',true);
 end if;
 update public.chat_push_queue set state='outcome_unknown',claimed_at=now() where id=q.id;
 -- Explicit recipient opt-in only for direct member chats. Health/professional
 -- chats stay generic even if kind is direct or a participant changed role.
 if c.kind='direct' and coalesce(to_jsonb(m)->>'photo_id','')='' and public.chat_role_for(c.client_id) not in('doctor','coach') and public.chat_role_for(c.professional_id) not in('doctor','coach')
 and exists(select 1 from public.chat_push_preferences where user_id=q.recipient_id and show_preview)
 then preview:=left(regexp_replace(m.body,'[[:cntrl:]]',' ','g'),120);end if;
 return jsonb_strip_nulls(jsonb_build_object('delivery_id',q.id,'token',t.token,'language',t.language,'preview',preview));
end $$;
create function public.chat_push_finish_v1(p_delivery uuid,p_state text,p_provider text default null,p_error text default null) returns void language plpgsql security definer set search_path='' as $$
begin
 if p_state not in('accepted','failed','invalid_token','outcome_unknown') then raise exception 'invalid_state';end if;
 update public.chat_push_queue set state=p_state,finished_at=now(),provider_id=left(p_provider,200),error_code=left(p_error,100)
 where id=p_delivery and state='outcome_unknown';
end $$;
revoke all on function public.chat_push_enqueue_v1(),public.chat_push_claim_v1(),public.chat_push_finish_v1(uuid,text,text,text) from public,anon,authenticated;
grant execute on function public.chat_push_claim_v1(),public.chat_push_finish_v1(uuid,text,text,text) to service_role;
commit;
