begin;
create or replace function public.chat_inbox_v3(p_only uuid default null,p_before_at timestamptz default null,p_before_id uuid default null,p_search text default '') returns table(id uuid,kind text,peer_id uuid,peer_label text,last_message_at timestamptz,unread bigint,writable boolean,blocked boolean,preview text,verified boolean,is_developer boolean) language plpgsql stable security definer set search_path='' as $$
begin
 if auth.uid() is null then raise exception 'not_authenticated' using errcode='42501';end if;
 if not public.chat_has_consent_v2() then raise exception 'consent_required' using errcode='42501';end if;
 if char_length(coalesce(p_search,''))>80 or (p_before_at is null)<>(p_before_id is null) then raise exception 'invalid_cursor';end if;
 return query select c.id,c.kind,case when c.client_id=auth.uid() then c.professional_id else c.client_id end,
 coalesce((select nullif(cp.display_name,'') from public.chat_profiles cp where cp.user_id=case when c.client_id=auth.uid() then c.professional_id else c.client_id end and cp.visible), (select coalesce(nullif(p.name,''),nullif(p.username,'')) from public.profiles p where p.id=case when c.client_id=auth.uid() then c.professional_id else c.client_id end),case when c.client_id=auth.uid() then c.professional_label else c.client_label end),coalesce(c.last_message_at,c.created_at),
 (select count(*) from public.chat_messages m where m.conversation_id=c.id and m.author_id<>auth.uid() and m.seq>case when c.client_id=auth.uid() then c.client_read_seq else c.professional_read_seq end),
 public.chat_link_active_v2(c.client_id,c.professional_id,c.kind) and not public.chat_blocked_between(c.client_id,c.professional_id),public.chat_blocked_between(c.client_id,c.professional_id),
 (select left(m.body,120) from public.chat_messages m where m.conversation_id=c.id order by m.seq desc limit 1),
 exists(select 1 from public.chat_verifications v where v.user_id=case when c.client_id=auth.uid() then c.professional_id else c.client_id end) or exists(select 1 from public.admin_users a where a.user_id=case when c.client_id=auth.uid() then c.professional_id else c.client_id end and a.role='super_admin'),
 exists(select 1 from public.admin_users a where a.user_id=case when c.client_id=auth.uid() then c.professional_id else c.client_id end and a.role='super_admin')
 from public.chat_conversations c where auth.uid() in(c.client_id,c.professional_id) and (p_only is null or c.id=p_only)
 and (p_before_at is null or (coalesce(c.last_message_at,c.created_at),c.id)<(p_before_at,p_before_id))
 and (coalesce(p_search,'')='' or position(lower(btrim(p_search)) in lower(coalesce((select nullif(cp.display_name,'') from public.chat_profiles cp where cp.user_id=case when c.client_id=auth.uid() then c.professional_id else c.client_id end and cp.visible), (select coalesce(nullif(p.name,''),nullif(p.username,'')) from public.profiles p where p.id=case when c.client_id=auth.uid() then c.professional_id else c.client_id end),case when c.client_id=auth.uid() then c.professional_label else c.client_label end)))>0)
 order by coalesce(c.last_message_at,c.created_at) desc,c.id desc limit 50;
end $$;

commit;
-- Reuse participant-RLS conversation refresh; no public presence or profile-update broadcasts.
begin;
create function public.chat_identity_broadcast() returns trigger language plpgsql security definer set search_path='' as $$begin
 update public.chat_conversations set receipt_updated_at=now() where new.user_id in(client_id,professional_id);
 return new;
end $$;
create trigger chat_identity_changed after insert or update on public.chat_profiles for each row execute function public.chat_identity_broadcast();
revoke all on function public.chat_identity_broadcast() from public,anon,authenticated;
commit;

begin;
create or replace function public.chat_contacts_v3(p_after_kind text default null,p_after_id uuid default null) returns table(user_id uuid,label text,kind text,verified boolean,is_developer boolean) language plpgsql stable security definer set search_path='' as $$
begin
 if auth.uid() is null then raise exception 'not_authenticated' using errcode='42501';end if;
 if not public.chat_has_consent_v2() then raise exception 'consent_required' using errcode='42501';end if;
 if (p_after_kind is null)<>(p_after_id is null) then raise exception 'invalid_cursor';end if;
 return query select q.uid,coalesce((select nullif(cp.display_name,'') from public.chat_profiles cp where cp.user_id=q.uid and cp.visible),nullif(p.name,''),nullif(p.username,''),case when q.k='support' then 'مطور GYMAK' else 'مستخدم' end)::text,q.k,
 (q.k='support' or exists(select 1 from public.chat_verifications v where v.user_id=q.uid)),q.k='support'
 from (select a.user_id uid,'support'::text k from public.admin_users a where a.role='super_admin'
 union select d.user_id,'doctor'::text from public.chat_doctor_grants d
 union select l.coach_id,'coach'::text from public.coach_links l where l.trainee_id=auth.uid() and l.status='active' and public.chat_role_for(l.coach_id)='coach') q left join public.profiles p on p.id=q.uid
 where q.uid<>auth.uid() and public.chat_link_active_v2(auth.uid(),q.uid,q.k)
 and (p_after_kind is null or (case when q.k='support' then '0' else q.k end,q.uid)>(case when p_after_kind='support' then '0' else p_after_kind end,p_after_id))
 order by case when q.k='support' then '0' else q.k end,q.uid limit 50;
end $$;

commit;
