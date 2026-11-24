begin;
-- Owner badges describe an app-owner decision, never a professional licence.
create table public.chat_verifications(user_id uuid primary key references auth.users(id) on delete cascade,verified_by uuid references auth.users(id) on delete set null,verified_at timestamptz not null default now());
create table public.chat_role_requests(id uuid primary key default gen_random_uuid(),user_id uuid not null references auth.users(id) on delete cascade,requested_role text not null check(requested_role in ('coach','doctor')),note text not null check(char_length(btrim(note)) between 10 and 500),status text not null default 'pending' check(status in ('pending','approved','declined')),created_at timestamptz not null default now(),decided_at timestamptz,decided_by uuid references auth.users(id) on delete set null);
create unique index chat_role_request_pending on public.chat_role_requests(user_id) where status='pending';
alter table public.chat_verifications enable row level security;
alter table public.chat_role_requests enable row level security;
revoke all on public.chat_verifications,public.chat_role_requests from public,anon,authenticated;
grant all on public.chat_verifications,public.chat_role_requests to service_role;
alter table public.chat_conversations drop constraint chat_conversations_kind_check;
alter table public.chat_conversations add constraint chat_conversations_kind_check check(kind in ('coach','doctor','support'));
create function public.chat_set_verified(p_user_id uuid,p_verified boolean) returns void language plpgsql security definer set search_path='' as $$
begin
 if not public.chat_is_owner() then raise exception 'owner_only' using errcode='42501'; end if;
 if p_verified is null then raise exception 'invalid_verification'; end if;
 if not exists(select 1 from auth.users where id=p_user_id) then raise exception 'account_not_found'; end if;
 if p_verified then insert into public.chat_verifications(user_id,verified_by) values(p_user_id,auth.uid()) on conflict(user_id) do update set verified_by=excluded.verified_by,verified_at=now();else delete from public.chat_verifications where user_id=p_user_id;end if;
end $$;
create function public.chat_role_request_submit(p_role text,p_note text) returns uuid language plpgsql security definer set search_path='' as $$
declare result uuid;begin
 if auth.uid() is null then raise exception 'not_authenticated' using errcode='42501';end if;
 if p_role is null or p_role not in ('coach','doctor') or p_note is null or char_length(btrim(p_note)) not between 10 and 500 then raise exception 'invalid_role_request';end if;
 perform pg_advisory_xact_lock(hashtext(auth.uid()::text));
 if exists(select 1 from public.chat_role_requests where user_id=auth.uid() and status='pending') then raise exception 'request_pending';end if;
 if exists(select 1 from public.chat_role_requests where user_id=auth.uid() and created_at>now()-interval '7 days') then raise exception 'request_rate_limited';end if;
 insert into public.chat_role_requests(user_id,requested_role,note) values(auth.uid(),p_role,btrim(p_note)) returning id into result;return result;
end $$;
create function public.chat_role_requests_list() returns jsonb language plpgsql stable security definer set search_path='' as $$
begin
 if auth.uid() is null then raise exception 'not_authenticated' using errcode='42501';end if;
 return coalesce((select jsonb_agg(to_jsonb(q)) from(select r.id,r.user_id,r.requested_role,r.note,r.status,r.created_at,coalesce(nullif(p.name,''),'مستخدم') label from public.chat_role_requests r left join public.profiles p on p.id=r.user_id where r.user_id=auth.uid() or public.chat_is_owner() order by (r.status='pending') desc,r.created_at desc limit 100)q),'[]'::jsonb);
end $$;
create function public.chat_role_request_decide(p_request_id uuid,p_approve boolean,p_verify boolean default false) returns void language plpgsql security definer set search_path='' as $$
declare r public.chat_role_requests;begin
 if not public.chat_is_owner() then raise exception 'owner_only' using errcode='42501';end if;
 if p_approve is null or p_verify is null or (not p_approve and p_verify) then raise exception 'invalid_decision';end if;
 select * into r from public.chat_role_requests where id=p_request_id for update;
 if not found or r.status<>'pending' then raise exception 'request_closed';end if;
 if p_approve then perform public.chat_set_user_role(r.user_id,r.requested_role);if p_verify then perform public.chat_set_verified(r.user_id,true);end if;end if;
 update public.chat_role_requests set status=case when p_approve then 'approved' else 'declined' end,decided_at=now(),decided_by=auth.uid() where id=r.id;
end $$;
-- Existing participant consent and health-role rules remain in effect.
create or replace function public.chat_link_active_v2(p_client uuid,p_professional uuid,p_kind text) returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.terms_acceptances where user_id=p_professional and version='2026-11-23-tou-v1')
 and case when p_kind='support' then exists(select 1 from public.admin_users where user_id=p_professional and role='super_admin')
 when p_kind='doctor' then public.chat_role_for(p_professional)='doctor'
 when p_kind='coach' then public.chat_role_for(p_professional)='coach' and exists(select 1 from public.coach_links where coach_id=p_professional and trainee_id=p_client and status='active') else false end;
$$;
create function public.chat_contacts_v3(p_after_kind text default null,p_after_id uuid default null) returns table(user_id uuid,label text,kind text,verified boolean,is_developer boolean) language plpgsql stable security definer set search_path='' as $$
begin
 if auth.uid() is null then raise exception 'not_authenticated' using errcode='42501';end if;
 if not public.chat_has_consent_v2() then raise exception 'consent_required' using errcode='42501';end if;
 if (p_after_kind is null)<>(p_after_id is null) then raise exception 'invalid_cursor';end if;
 return query select q.uid,coalesce(nullif(p.name,''),nullif(p.username,''),case when q.k='support' then 'مطور GYMAK' else 'مستخدم' end)::text,q.k,
 (q.k='support' or exists(select 1 from public.chat_verifications v where v.user_id=q.uid)),q.k='support'
 from (select a.user_id uid,'support'::text k from public.admin_users a where a.role='super_admin'
 union select d.user_id,'doctor'::text from public.chat_doctor_grants d
 union select l.coach_id,'coach'::text from public.coach_links l where l.trainee_id=auth.uid() and l.status='active' and public.chat_role_for(l.coach_id)='coach') q left join public.profiles p on p.id=q.uid
 where q.uid<>auth.uid() and public.chat_link_active_v2(auth.uid(),q.uid,q.k)
 and (p_after_kind is null or (case when q.k='support' then '0' else q.k end,q.uid)>(case when p_after_kind='support' then '0' else p_after_kind end,p_after_id))
 order by case when q.k='support' then '0' else q.k end,q.uid limit 50;
end $$;
create function public.chat_inbox_v3(p_only uuid default null,p_before_at timestamptz default null,p_before_id uuid default null,p_search text default '') returns table(id uuid,kind text,peer_id uuid,peer_label text,last_message_at timestamptz,unread bigint,writable boolean,blocked boolean,preview text,verified boolean,is_developer boolean) language plpgsql stable security definer set search_path='' as $$
begin
 if auth.uid() is null then raise exception 'not_authenticated' using errcode='42501';end if;
 if not public.chat_has_consent_v2() then raise exception 'consent_required' using errcode='42501';end if;
 if char_length(coalesce(p_search,''))>80 or (p_before_at is null)<>(p_before_id is null) then raise exception 'invalid_cursor';end if;
 return query select c.id,c.kind,case when c.client_id=auth.uid() then c.professional_id else c.client_id end,
 case when c.client_id=auth.uid() then c.professional_label else c.client_label end,coalesce(c.last_message_at,c.created_at),
 (select count(*) from public.chat_messages m where m.conversation_id=c.id and m.author_id<>auth.uid() and m.seq>case when c.client_id=auth.uid() then c.client_read_seq else c.professional_read_seq end),
 public.chat_link_active_v2(c.client_id,c.professional_id,c.kind) and not public.chat_blocked_between(c.client_id,c.professional_id),public.chat_blocked_between(c.client_id,c.professional_id),
 (select left(m.body,120) from public.chat_messages m where m.conversation_id=c.id order by m.seq desc limit 1),
 exists(select 1 from public.chat_verifications v where v.user_id=case when c.client_id=auth.uid() then c.professional_id else c.client_id end) or exists(select 1 from public.admin_users a where a.user_id=case when c.client_id=auth.uid() then c.professional_id else c.client_id end and a.role='super_admin'),
 exists(select 1 from public.admin_users a where a.user_id=case when c.client_id=auth.uid() then c.professional_id else c.client_id end and a.role='super_admin')
 from public.chat_conversations c where auth.uid() in(c.client_id,c.professional_id) and (p_only is null or c.id=p_only)
 and (p_before_at is null or (coalesce(c.last_message_at,c.created_at),c.id)<(p_before_at,p_before_id))
 and (coalesce(p_search,'')='' or position(lower(btrim(p_search)) in lower(case when c.client_id=auth.uid() then c.professional_label else c.client_label end))>0)
 order by coalesce(c.last_message_at,c.created_at) desc,c.id desc limit 50;
end $$;
-- Badge lookup for the existing owner directory, no new user enumeration.
create function public.chat_owner_badges() returns jsonb language plpgsql stable security definer set search_path='' as $$begin
 if not public.chat_is_owner() then raise exception 'owner_only' using errcode='42501';end if;
 return coalesce((select jsonb_agg(user_id) from public.chat_verifications),'[]'::jsonb);end $$;
revoke all on function public.chat_set_verified(uuid,boolean),public.chat_role_request_submit(text,text),public.chat_role_requests_list(),public.chat_role_request_decide(uuid,boolean,boolean),public.chat_contacts_v3(text,uuid),public.chat_inbox_v3(uuid,timestamptz,uuid,text),public.chat_owner_badges() from public,anon,authenticated;
grant execute on function public.chat_set_verified(uuid,boolean),public.chat_role_request_submit(text,text),public.chat_role_requests_list(),public.chat_role_request_decide(uuid,boolean,boolean),public.chat_contacts_v3(text,uuid),public.chat_inbox_v3(uuid,timestamptz,uuid,text),public.chat_owner_badges() to authenticated;
commit;
