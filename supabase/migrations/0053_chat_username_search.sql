-- Preparation only. Existing participants may search their own inbox by username.
-- Discovery opt-in and block/terms checks remain unchanged.
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
 and (coalesce(p_search,'')='' or position(lower(ltrim(btrim(p_search),'@')) in lower(coalesce((select p.username from public.profiles p where p.id=case when c.client_id=auth.uid() then c.professional_id else c.client_id end),'')))>0 or position(lower(btrim(p_search)) in lower(coalesce((select nullif(cp.display_name,'') from public.chat_profiles cp where cp.user_id=case when c.client_id=auth.uid() then c.professional_id else c.client_id end and cp.visible), (select coalesce(nullif(p.name,''),nullif(p.username,'')) from public.profiles p where p.id=case when c.client_id=auth.uid() then c.professional_id else c.client_id end),case when c.client_id=auth.uid() then c.professional_label else c.client_label end)))>0)
 order by coalesce(c.last_message_at,c.created_at) desc,c.id desc limit 50;
end $$;

commit;