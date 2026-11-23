-- 0027_ugc_terms_moderation.sql
-- Google Play UGC requirements: versioned Terms-of-Use consent, in-app report and
-- block for the private chat, support-reply reporting, and an owner moderation queue
-- that exposes ONLY content a user reported. Requires 0022/0023 (feedback) and 0024 (chat).
-- Additive candidate, one-time transactional migration. Do not apply without approval.
begin;
create table public.apk18_rollout_control(id boolean primary key default true check(id),chat_writes boolean not null default false,identity_signup boolean not null default false);
insert into public.apk18_rollout_control(id) values(true);
alter table public.apk18_rollout_control enable row level security;
revoke all on public.apk18_rollout_control from public,anon,authenticated;
grant all on public.apk18_rollout_control to service_role;

-- 1) Terms of Use acceptance, versioned independently so a future ToU change forces re-consent.
create table if not exists public.terms_acceptances (
  user_id uuid not null references auth.users(id) on delete cascade,
  version text not null check (version = '2026-11-23-tou-v1'),
  accepted_at timestamptz not null default now(),
  primary key (user_id, version)
);
alter table public.terms_acceptances enable row level security;
create policy "terms acceptances: own" on public.terms_acceptances for select to authenticated
  using (user_id = auth.uid());

-- 2) User-controlled blocks. Either participant can block the other; history is kept.
create table if not exists public.chat_blocks (
  blocker_id uuid not null references auth.users(id) on delete cascade,
  blocked_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  check (blocker_id <> blocked_id)
);
alter table public.chat_blocks enable row level security;
create policy "chat blocks: participants read" on public.chat_blocks for select to authenticated
  using (auth.uid() in (blocker_id, blocked_id));

-- 3) Moderation reports. The owner can read reports only, and each report carries a
-- snapshot of exactly the reported content taken at report time. No general message access.
create table if not exists public.moderation_reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references auth.users(id) on delete cascade,
  target_type text not null check (target_type in ('chat_message', 'chat_user', 'support_reply')),
  target_user_id uuid references auth.users(id) on delete cascade,
  conversation_id uuid,
  message_id uuid,
  feedback_id uuid,
  content_snapshot text check (content_snapshot is null or char_length(content_snapshot) between 1 and 4000),
  reason text not null check (reason in ('abuse', 'sexual', 'scam', 'impersonation', 'other')),
  details text check (details is null or char_length(details) between 1 and 1000),
  status text not null default 'open' check (status in ('open', 'reviewed', 'actioned', 'dismissed')),
  reviewed_by uuid references auth.users(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists moderation_reports_status_created on public.moderation_reports(status, created_at desc);
create unique index if not exists moderation_reports_dedup on public.moderation_reports
  (reporter_id, target_type, coalesce(message_id, feedback_id, target_user_id, '00000000-0000-0000-0000-000000000000'::uuid));

alter table public.moderation_reports enable row level security;
create policy "moderation reports: reporter or owner" on public.moderation_reports for select to authenticated
  using (reporter_id = auth.uid() or public.chat_is_owner());

revoke all on public.terms_acceptances, public.chat_blocks, public.moderation_reports from public, anon, authenticated;
grant select on public.terms_acceptances, public.chat_blocks, public.moderation_reports to authenticated;
grant all on public.terms_acceptances, public.chat_blocks, public.moderation_reports to service_role;

-- Consent now means the ToU-bearing version; older consents stay as history only.
create function public.chat_has_consent_v2() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists(select 1 from public.terms_acceptances where user_id = auth.uid() and version = '2026-11-23-tou-v1');
$$;

create function public.terms_status() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'not_authenticated' using errcode = '42501'; end if;
  return jsonb_build_object('version', '2026-11-23-tou-v1',
    'accepted', exists(select 1 from public.terms_acceptances where user_id = auth.uid() and version = '2026-11-23-tou-v1'));
end $$;

create function public.terms_accept(p_version text) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'not_authenticated' using errcode = '42501'; end if;
  if p_version is distinct from '2026-11-23-tou-v1' then raise exception 'terms_version_mismatch'; end if;
  insert into public.terms_acceptances(user_id, version) values(auth.uid(), p_version) on conflict do nothing;
end $$;

-- One tap accepts the chat privacy notice and the Terms of Use together.
create function public.chat_accept_terms_v2(p_version text) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'not_authenticated' using errcode = '42501'; end if;
  if p_version is distinct from '2026-11-23-tou-v1' then raise exception 'terms_version_mismatch'; end if;
  insert into public.chat_consents(user_id, version) values(auth.uid(), '2026-11-22-v1') on conflict do nothing;
  insert into public.terms_acceptances(user_id, version) values(auth.uid(), p_version) on conflict do nothing;
end $$;

create function public.chat_bootstrap_v2() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'not_authenticated' using errcode = '42501'; end if;
  return jsonb_build_object('consent', public.chat_has_consent_v2(), 'role', public.chat_role_for(auth.uid()),
    'owner', public.chat_is_owner(), 'version', '2026-11-23-tou-v1');
end $$;

-- Professionals must hold the new consent too.
create function public.chat_link_active_v2(p_client uuid, p_professional uuid, p_kind text) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists(select 1 from public.terms_acceptances where user_id = p_professional and version = '2026-11-23-tou-v1')
    and case when p_kind = 'doctor' then public.chat_role_for(p_professional) = 'doctor'
    when p_kind = 'coach' then public.chat_role_for(p_professional) = 'coach' and exists(
      select 1 from public.coach_links where coach_id = p_professional and trainee_id = p_client and status = 'active'
    ) else false end;
$$;

create function public.chat_contacts_v2(p_after_kind text default null, p_after_id uuid default null)
returns table(user_id uuid, label text, kind text)
language plpgsql stable security definer set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'not_authenticated' using errcode = '42501'; end if;
  if not public.chat_has_consent_v2() then raise exception 'consent_required' using errcode = '42501'; end if;
  if (p_after_kind is null) <> (p_after_id is null) then raise exception 'invalid_cursor'; end if;
  return query
    select q.uid, coalesce(nullif(btrim(p.name), ''), nullif(btrim(p.username), ''), 'مستخدم')::text, q.k
    from (
      select d.user_id uid, 'doctor'::text k from public.chat_doctor_grants d
      union
      select l.coach_id uid, 'coach'::text k from public.coach_links l
        where l.trainee_id = auth.uid() and l.status = 'active' and public.chat_role_for(l.coach_id) = 'coach'
    ) q left join public.profiles p on p.id = q.uid
    where q.uid <> auth.uid() and exists(select 1 from public.terms_acceptances cs where cs.user_id = q.uid and cs.version = '2026-11-23-tou-v1') and (p_after_kind is null or (q.k,q.uid) > (p_after_kind,p_after_id)) order by q.k, q.uid limit 50;
end $$;

-- Block helpers. Not granted to authenticated: used only inside the audited RPCs.
create function public.chat_blocked_between(p_a uuid, p_b uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists(select 1 from public.chat_blocks
    where (blocker_id = p_a and blocked_id = p_b) or (blocker_id = p_b and blocked_id = p_a));
$$;

create function public.chat_block(p_user_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare v_me uuid := auth.uid();
begin
  if v_me is null then raise exception 'not_authenticated' using errcode = '42501'; end if;
  if not public.chat_has_consent_v2() then raise exception 'consent_required' using errcode = '42501'; end if;
  if p_user_id is null or p_user_id = v_me then raise exception 'invalid_block'; end if;
  if not exists(select 1 from auth.users where id = p_user_id) then raise exception 'account_not_found'; end if;
  insert into public.chat_blocks(blocker_id, blocked_id) values(v_me, p_user_id) on conflict do nothing;
end $$;

create function public.chat_unblock(p_user_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'not_authenticated' using errcode = '42501'; end if;
  delete from public.chat_blocks where blocker_id = auth.uid() and blocked_id = p_user_id;
end $$;

create function public.chat_blocks_mine()
returns table(blocked_id uuid, created_at timestamptz)
language plpgsql stable security definer set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'not_authenticated' using errcode = '42501'; end if;
  return query select b.blocked_id, b.created_at from public.chat_blocks b where b.blocker_id = auth.uid() order by b.created_at desc limit 200;
end $$;

-- Blocking stops new conversations and new sends in both directions; history stays readable.
create function public.chat_start_v2(p_professional_id uuid, p_kind text) returns uuid
language plpgsql security definer set search_path = '' as $$
declare v_id uuid; v_me uuid := auth.uid();
begin
  if v_me is null then raise exception 'not_authenticated' using errcode = '42501'; end if;
  if not public.chat_has_consent_v2() then raise exception 'consent_required' using errcode = '42501'; end if;
  if v_me = p_professional_id or not public.chat_link_active_v2(v_me, p_professional_id, p_kind) then
    raise exception 'chat_not_allowed' using errcode = '42501';
  end if;
  if public.chat_blocked_between(v_me, p_professional_id) then
    raise exception 'chat_blocked' using errcode = '42501';
  end if;
  -- Stable pair: the professional is chosen, never an arbitrary third participant.
  perform pg_advisory_xact_lock(hashtext(v_me::text));
  select id into v_id from public.chat_conversations
    where client_id = v_me and professional_id = p_professional_id and kind = p_kind;
  if v_id is not null then return v_id; end if;
  if (select count(*) from public.chat_conversations where client_id = v_me and created_at > now() - interval '1 day') >= 10 then
    raise exception 'chat_rate_limited';
  end if;
  insert into public.chat_conversations(client_id, professional_id, kind, client_label, professional_label)
  values(v_me, p_professional_id, p_kind,
    left(coalesce((select coalesce(nullif(btrim(name), ''), nullif(btrim(username), '')) from public.profiles where id = v_me), 'مستخدم'), 80),
    left(coalesce((select coalesce(nullif(btrim(name), ''), nullif(btrim(username), '')) from public.profiles where id = p_professional_id), 'مستخدم'), 80))
  returning id into v_id;
  return v_id;
end $$;

create function public.chat_send_v2(p_conversation_id uuid, p_body text, p_client_id uuid)
returns setof public.chat_messages language plpgsql security definer set search_path = '' as $$
declare v_me uuid := auth.uid(); v_c public.chat_conversations; v_m public.chat_messages; v_body text := btrim(p_body);
begin
  if v_me is null then raise exception 'not_authenticated' using errcode = '42501'; end if;
  if not public.chat_has_consent_v2() then raise exception 'consent_required' using errcode = '42501'; end if;
  select * into v_c from public.chat_conversations where id = p_conversation_id and v_me in (client_id, professional_id);
  if not found then raise exception 'chat_not_allowed' using errcode = '42501'; end if;
  if public.chat_blocked_between(v_c.client_id, v_c.professional_id) then
    raise exception 'chat_blocked' using errcode = '42501';
  end if;
  if p_client_id is null or v_body is null or char_length(v_body) not between 1 and 2000 then raise exception 'invalid_message'; end if;
  perform pg_advisory_xact_lock(hashtext(v_me::text));
  select * into v_m from public.chat_messages where author_id = v_me and client_id = p_client_id;
  if found then
    if v_m.conversation_id <> p_conversation_id or v_m.body <> v_body then raise exception 'idempotency_conflict'; end if;
    return next v_m; return;
  end if;
  if not public.chat_link_active_v2(v_c.client_id, v_c.professional_id, v_c.kind) then
    raise exception 'chat_read_only' using errcode = '42501';
  end if;
  if (select count(*) from public.chat_messages where author_id = v_me and created_at > now() - interval '1 minute') >= 20
    or (select count(*) from public.chat_messages where author_id = v_me and created_at > now() - interval '1 day') >= 300 then
    raise exception 'chat_rate_limited';
  end if;
  insert into public.chat_messages(conversation_id, author_id, client_id, body)
    values(p_conversation_id, v_me, p_client_id, v_body) returning * into v_m;
  update public.chat_conversations set last_message_at = v_m.created_at where id = p_conversation_id;
  return next v_m;
end $$;

-- Versioned inbox leaves the old return type unchanged.
create function public.chat_inbox_v2(p_only uuid default null, p_before_at timestamptz default null, p_before_id uuid default null)
returns table(id uuid, kind text, peer_id uuid, peer_label text, last_message_at timestamptz, unread bigint, writable boolean, blocked boolean)
language plpgsql stable security definer set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'not_authenticated' using errcode = '42501'; end if;
  if not public.chat_has_consent_v2() then raise exception 'consent_required' using errcode = '42501'; end if;
  return query select c.id, c.kind,
    case when c.client_id = auth.uid() then c.professional_id else c.client_id end,
    case when c.client_id = auth.uid() then c.professional_label else c.client_label end,
    coalesce(c.last_message_at, c.created_at),
    (select count(*) from public.chat_messages m where m.conversation_id = c.id and m.author_id <> auth.uid()
      and m.seq > case when c.client_id = auth.uid() then c.client_read_seq else c.professional_read_seq end),
    public.chat_link_active_v2(c.client_id, c.professional_id, c.kind) and not public.chat_blocked_between(c.client_id, c.professional_id),
    public.chat_blocked_between(c.client_id, c.professional_id)
    from public.chat_conversations c where auth.uid() in (c.client_id, c.professional_id)
      and (p_only is null or c.id = p_only)
      and (p_before_at is null or (coalesce(c.last_message_at, c.created_at), c.id) < (p_before_at, p_before_id))
    order by coalesce(c.last_message_at, c.created_at) desc, c.id desc limit 50;
end $$;

-- 4) Reporting. Snapshots exactly the reported content so the owner never needs wider read access.
create function public.moderation_report(
  p_target_type text, p_reason text,
  p_target_user_id uuid default null, p_conversation_id uuid default null,
  p_message_id uuid default null, p_feedback_id uuid default null,
  p_details text default null
) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  v_me uuid := auth.uid(); v_id uuid;
  v_snapshot text; v_target uuid := p_target_user_id; v_conversation uuid := p_conversation_id;
  v_details text := nullif(btrim(coalesce(p_details, '')), '');
begin
  if v_me is null then raise exception 'not_authenticated' using errcode = '42501'; end if;
  if not public.chat_has_consent_v2() then raise exception 'consent_required' using errcode = '42501'; end if;
  if p_reason is null or p_reason not in ('abuse', 'sexual', 'scam', 'impersonation', 'other') then raise exception 'invalid_reason'; end if;
  if char_length(coalesce(v_details, '')) > 1000 then raise exception 'invalid_details'; end if;
  if (select count(*) from public.moderation_reports where reporter_id = v_me and created_at > now() - interval '1 hour') >= 10 then
    raise exception 'report_rate_limited';
  end if;
  if p_target_type = 'chat_message' then
    select m.body, m.author_id, m.conversation_id into v_snapshot, v_target, v_conversation
      from public.chat_messages m join public.chat_conversations c on c.id = m.conversation_id
      where m.id = p_message_id and v_me in (c.client_id, c.professional_id);
    if not found then raise exception 'report_not_allowed' using errcode = '42501'; end if;
    if v_target = v_me then raise exception 'report_self'; end if;
  elsif p_target_type = 'chat_user' then
    if v_target is null or v_target = v_me then raise exception 'report_self'; end if;
    if not exists(select 1 from public.chat_conversations c
      where (c.client_id = v_me and c.professional_id = v_target) or (c.professional_id = v_me and c.client_id = v_target)) then
      raise exception 'report_not_allowed' using errcode = '42501';
    end if;
    v_snapshot := null;
  elsif p_target_type = 'support_reply' then
    select f.admin_reply into v_snapshot from public.feedback f
      where f.id = p_feedback_id and f.user_id = v_me and f.admin_reply is not null;
    if not found then raise exception 'report_not_allowed' using errcode = '42501'; end if;
    v_target := null; v_conversation := null;
  else
    raise exception 'invalid_target_type';
  end if;
  insert into public.moderation_reports(reporter_id, target_type, target_user_id, conversation_id, message_id, feedback_id, content_snapshot, reason, details)
    values (v_me, p_target_type, v_target, v_conversation, p_message_id, p_feedback_id, v_snapshot, p_reason, v_details)
    returning id into v_id;
  return v_id;
exception when unique_violation then raise exception 'report_duplicate';
end $$;

create function public.moderation_reports_list(p_status text default 'open',
  p_before_at timestamptz default null, p_before_id uuid default null)
returns table(id uuid, target_type text, reporter_label text, target_label text, content_snapshot text,
  reason text, details text, status text, conversation_id uuid, target_user_id uuid, created_at timestamptz)
language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.chat_is_owner() then raise exception 'owner_only' using errcode = '42501'; end if;
  if p_status is null or p_status not in ('all', 'open', 'reviewed', 'actioned', 'dismissed') then raise exception 'invalid_status'; end if;
  if (p_before_at is null) <> (p_before_id is null) then raise exception 'invalid_cursor'; end if;
  return query
    select r.id, r.target_type,
      coalesce(nullif(btrim(rp.name), ''), nullif(btrim(rp.username), ''), 'مستخدم')::text,
      case when r.target_user_id is null then null else
        coalesce(nullif(btrim(tp.name), ''), nullif(btrim(tp.username), ''), 'مستخدم')::text end,
      r.content_snapshot, r.reason, r.details, r.status, r.conversation_id, r.target_user_id, r.created_at
    from public.moderation_reports r
    left join public.profiles rp on rp.id = r.reporter_id
    left join public.profiles tp on tp.id = r.target_user_id
    where (p_status = 'all' or r.status = p_status)
      and (p_before_at is null or (r.created_at, r.id) < (p_before_at, p_before_id))
    order by r.created_at desc, r.id desc limit 50;
end $$;

create function public.moderation_report_update(p_id uuid, p_status text) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not public.chat_is_owner() then raise exception 'owner_only' using errcode = '42501'; end if;
  if p_status is null or p_status not in ('open', 'reviewed', 'actioned', 'dismissed') then raise exception 'invalid_status'; end if;
  update public.moderation_reports set status = p_status, reviewed_by = auth.uid(), reviewed_at = now() where id = p_id;
  if not found then raise exception 'report_not_found'; end if;
end $$;

revoke all on function public.chat_has_consent_v2(),public.chat_link_active_v2(uuid,uuid,text),public.chat_bootstrap_v2(),public.chat_accept_terms_v2(text),public.chat_contacts_v2(text,uuid),public.chat_start_v2(uuid,text),public.chat_inbox_v2(uuid,timestamptz,uuid),public.chat_send_v2(uuid,text,uuid),public.chat_blocked_between(uuid,uuid),public.chat_block(uuid),public.chat_unblock(uuid),public.chat_blocks_mine(),public.terms_status(),public.terms_accept(text),public.moderation_report(text,text,uuid,uuid,uuid,uuid,text),public.moderation_reports_list(text,timestamptz,uuid),public.moderation_report_update(uuid,text) from public,anon,authenticated;
grant execute on function public.chat_has_consent_v2(),public.chat_bootstrap_v2(),public.chat_accept_terms_v2(text),public.chat_contacts_v2(text,uuid),public.chat_start_v2(uuid,text),public.chat_inbox_v2(uuid,timestamptz,uuid),public.chat_send_v2(uuid,text,uuid),public.chat_block(uuid),public.chat_unblock(uuid),public.chat_blocks_mine(),public.terms_status(),public.terms_accept(text),public.moderation_report(text,text,uuid,uuid,uuid,uuid,text),public.moderation_reports_list(text,timestamptz,uuid),public.moderation_report_update(uuid,text) to authenticated;

-- New restrictive writes apply to old RPCs as well. No existing definition is changed.
create function public.enforce_chat_safety_v2() returns trigger language plpgsql security definer set search_path='' as $$
declare a uuid; b uuid;
begin
 if not exists(select 1 from public.apk18_rollout_control where id and chat_writes) then raise exception 'chat_paused';end if;
 if TG_TABLE_NAME='chat_messages' then
  select client_id,professional_id into a,b from public.chat_conversations where id=new.conversation_id;
 else a:=new.client_id;b:=new.professional_id;end if;
 if public.chat_blocked_between(a,b) then raise exception 'chat_blocked';end if;
 if not exists(select 1 from public.terms_acceptances where user_id=a and version='2026-11-23-tou-v1')
 or not exists(select 1 from public.terms_acceptances where user_id=b and version='2026-11-23-tou-v1') then raise exception 'consent_required';end if;
 return new;
end $$;
revoke all on function public.enforce_chat_safety_v2() from public,anon,authenticated;
create trigger enforce_chat_message_safety_v2 before insert on public.chat_messages for each row execute function public.enforce_chat_safety_v2();
create trigger enforce_chat_thread_safety_v2 before insert on public.chat_conversations for each row execute function public.enforce_chat_safety_v2();
notify pgrst, 'reload schema';
commit;
