-- Phase 1 private chat. REVIEW ONLY: do not apply to production without approval.
-- Requires 0018/0019 (admin_users, coach_grants, coach_links, profiles).
-- HTTPS + participant access control, NOT end-to-end encryption.
-- Database operators/service-role credentials can read stored message bodies.
begin;

create table if not exists public.chat_doctor_grants (
  user_id uuid primary key references auth.users(id) on delete cascade,
  granted_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);
create table if not exists public.chat_consents (
  user_id uuid not null references auth.users(id) on delete cascade,
  version text not null check (version = '2026-11-22-v1'),
  accepted_at timestamptz not null default now(),
  primary key (user_id, version)
);
create table if not exists public.chat_conversations (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references auth.users(id) on delete cascade,
  professional_id uuid not null references auth.users(id) on delete cascade,
  kind text not null check (kind in ('doctor', 'coach')),
  client_label text not null check (char_length(client_label) between 1 and 80),
  professional_label text not null check (char_length(professional_label) between 1 and 80),
  client_read_seq bigint not null default 0,
  professional_read_seq bigint not null default 0,
  created_at timestamptz not null default now(),
  last_message_at timestamptz,
  check (client_id <> professional_id),
  unique (client_id, professional_id, kind)
);
create table if not exists public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  seq bigint generated always as identity unique,
  conversation_id uuid not null references public.chat_conversations(id) on delete cascade,
  author_id uuid not null references auth.users(id) on delete cascade,
  client_id uuid not null,
  body text not null check (char_length(btrim(body)) between 1 and 2000),
  created_at timestamptz not null default now(),
  unique (author_id, client_id)
);
create index if not exists chat_messages_thread_seq on public.chat_messages(conversation_id, seq desc);
create index if not exists chat_messages_author_time on public.chat_messages(author_id, created_at desc);
create index if not exists chat_conversations_client on public.chat_conversations(client_id, last_message_at desc);
create index if not exists chat_conversations_professional on public.chat_conversations(professional_id, last_message_at desc);

-- No caller-controlled user ID and no general is_admin shortcut.
create or replace function public.chat_is_owner() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists(select 1 from public.admin_users where user_id = auth.uid() and role = 'super_admin');
$$;
create or replace function public.chat_has_consent() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists(select 1 from public.chat_consents where user_id = auth.uid() and version = '2026-11-22-v1');
$$;
create or replace function public.chat_role_for(p_user_id uuid) returns text
language sql stable security definer set search_path = '' as $$
  select case when exists(select 1 from public.chat_doctor_grants where user_id = p_user_id) then 'doctor'
    when public.is_coach(p_user_id) then 'coach' else 'user' end;
$$;
create or replace function public.chat_link_active(p_client uuid, p_professional uuid, p_kind text) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists(select 1 from public.chat_consents where user_id = p_professional and version = '2026-11-22-v1')
    and case when p_kind = 'doctor' then public.chat_role_for(p_professional) = 'doctor'
    when p_kind = 'coach' then public.chat_role_for(p_professional) = 'coach' and exists(
      select 1 from public.coach_links where coach_id = p_professional and trainee_id = p_client and status = 'active'
    ) else false end;
$$;

alter table public.chat_doctor_grants enable row level security;
alter table public.chat_consents enable row level security;
alter table public.chat_conversations enable row level security;
alter table public.chat_messages enable row level security;

drop policy if exists "chat doctor grants: own or owner" on public.chat_doctor_grants;
create policy "chat doctor grants: own or owner" on public.chat_doctor_grants for select to authenticated
  using (user_id = auth.uid() or public.chat_is_owner());
drop policy if exists "chat consents: own" on public.chat_consents;
create policy "chat consents: own" on public.chat_consents for select to authenticated using (user_id = auth.uid());
drop policy if exists "chat conversations: participants only" on public.chat_conversations;
create policy "chat conversations: participants only" on public.chat_conversations for select to authenticated
  using (auth.uid() in (client_id, professional_id) and public.chat_has_consent());
drop policy if exists "chat messages: participants only" on public.chat_messages;
create policy "chat messages: participants only" on public.chat_messages for select to authenticated using (
  public.chat_has_consent() and exists(select 1 from public.chat_conversations c
    where c.id = conversation_id and auth.uid() in (c.client_id, c.professional_id))
);

-- Only audited RPCs below can write; no direct insert/update/delete permissions.
revoke all on public.chat_doctor_grants, public.chat_consents, public.chat_conversations, public.chat_messages from public, anon, authenticated;
grant select on public.chat_doctor_grants, public.chat_consents, public.chat_conversations, public.chat_messages to authenticated;
grant all on public.chat_doctor_grants, public.chat_consents, public.chat_conversations, public.chat_messages to service_role;
grant usage, select on sequence public.chat_messages_seq_seq to service_role;

create or replace function public.chat_bootstrap() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'not_authenticated' using errcode = '42501'; end if;
  return jsonb_build_object('consent', public.chat_has_consent(), 'role', public.chat_role_for(auth.uid()),
    'owner', public.chat_is_owner(), 'version', '2026-11-22-v1');
end $$;

create or replace function public.chat_accept_terms(p_version text) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'not_authenticated' using errcode = '42501'; end if;
  if p_version is distinct from '2026-11-22-v1' then raise exception 'terms_version_mismatch'; end if;
  insert into public.chat_consents(user_id, version) values(auth.uid(), p_version) on conflict do nothing;
end $$;

-- Minimal directory: doctors plus the caller's already accepted coaches. No emails.
create or replace function public.chat_contacts(p_after_kind text default null, p_after_id uuid default null)
returns table(user_id uuid, label text, kind text)
language plpgsql stable security definer set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'not_authenticated' using errcode = '42501'; end if;
  if not public.chat_has_consent() then raise exception 'consent_required' using errcode = '42501'; end if;
  if (p_after_kind is null) <> (p_after_id is null) then raise exception 'invalid_cursor'; end if;
  return query
    select q.uid, coalesce(nullif(btrim(p.name), ''), nullif(btrim(p.username), ''), 'مستخدم')::text, q.k
    from (
      select d.user_id uid, 'doctor'::text k from public.chat_doctor_grants d
      union
      select l.coach_id uid, 'coach'::text k from public.coach_links l
        where l.trainee_id = auth.uid() and l.status = 'active' and public.chat_role_for(l.coach_id) = 'coach'
    ) q left join public.profiles p on p.id = q.uid
    where q.uid <> auth.uid() and exists(select 1 from public.chat_consents cs where cs.user_id = q.uid and cs.version = '2026-11-22-v1') and (p_after_kind is null or (q.k,q.uid) > (p_after_kind,p_after_id)) order by q.k, q.uid limit 50;
end $$;

create or replace function public.chat_start(p_professional_id uuid, p_kind text) returns uuid
language plpgsql security definer set search_path = '' as $$
declare v_id uuid; v_me uuid := auth.uid();
begin
  if v_me is null then raise exception 'not_authenticated' using errcode = '42501'; end if;
  if not public.chat_has_consent() then raise exception 'consent_required' using errcode = '42501'; end if;
  if v_me = p_professional_id or not public.chat_link_active(v_me, p_professional_id, p_kind) then
    raise exception 'chat_not_allowed' using errcode = '42501';
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

create or replace function public.chat_inbox(p_only uuid default null, p_before_at timestamptz default null, p_before_id uuid default null)
returns table(id uuid, kind text, peer_id uuid, peer_label text, last_message_at timestamptz, unread bigint, writable boolean)
language plpgsql stable security definer set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'not_authenticated' using errcode = '42501'; end if;
  if not public.chat_has_consent() then raise exception 'consent_required' using errcode = '42501'; end if;
  return query select c.id, c.kind,
    case when c.client_id = auth.uid() then c.professional_id else c.client_id end,
    case when c.client_id = auth.uid() then c.professional_label else c.client_label end,
    coalesce(c.last_message_at, c.created_at),
    (select count(*) from public.chat_messages m where m.conversation_id = c.id and m.author_id <> auth.uid()
      and m.seq > case when c.client_id = auth.uid() then c.client_read_seq else c.professional_read_seq end),
    public.chat_link_active(c.client_id, c.professional_id, c.kind)
    from public.chat_conversations c where auth.uid() in (c.client_id, c.professional_id)
      and (p_only is null or c.id = p_only)
      and (p_before_at is null or (coalesce(c.last_message_at, c.created_at), c.id) < (p_before_at, p_before_id))
    order by coalesce(c.last_message_at, c.created_at) desc, c.id desc limit 50;
end $$;

create or replace function public.chat_send(p_conversation_id uuid, p_body text, p_client_id uuid)
returns setof public.chat_messages language plpgsql security definer set search_path = '' as $$
declare v_me uuid := auth.uid(); v_c public.chat_conversations; v_m public.chat_messages; v_body text := btrim(p_body);
begin
  if v_me is null then raise exception 'not_authenticated' using errcode = '42501'; end if;
  if not public.chat_has_consent() then raise exception 'consent_required' using errcode = '42501'; end if;
  select * into v_c from public.chat_conversations where id = p_conversation_id and v_me in (client_id, professional_id);
  if not found then raise exception 'chat_not_allowed' using errcode = '42501'; end if;
  if p_client_id is null or v_body is null or char_length(v_body) not between 1 and 2000 then raise exception 'invalid_message'; end if;
  perform pg_advisory_xact_lock(hashtext(v_me::text));
  select * into v_m from public.chat_messages where author_id = v_me and client_id = p_client_id;
  if found then
    if v_m.conversation_id <> p_conversation_id or v_m.body <> v_body then raise exception 'idempotency_conflict'; end if;
    return next v_m; return;
  end if;
  if not public.chat_link_active(v_c.client_id, v_c.professional_id, v_c.kind) then
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

-- Read through the last displayed sequence, not now(): never mark an unseen newer message read.
create or replace function public.chat_mark_read(p_conversation_id uuid, p_through_seq bigint) returns void
language plpgsql security definer set search_path = '' as $$
declare v_c public.chat_conversations; v_seq bigint;
begin
  if auth.uid() is null or not public.chat_has_consent() then raise exception 'not_allowed' using errcode = '42501'; end if;
  select * into v_c from public.chat_conversations where id = p_conversation_id and auth.uid() in (client_id, professional_id);
  if not found then raise exception 'chat_not_allowed' using errcode = '42501'; end if;
  select max(seq) into v_seq from public.chat_messages where conversation_id = p_conversation_id and seq <= p_through_seq;
  if v_seq is null then return; end if;
  if auth.uid() = v_c.client_id then
    update public.chat_conversations set client_read_seq = greatest(client_read_seq, v_seq) where id = p_conversation_id;
  else
    update public.chat_conversations set professional_read_seq = greatest(professional_read_seq, v_seq) where id = p_conversation_id;
  end if;
end $$;

-- Role changes are owner-only, not available to the general admin/sender role.
-- A coach/client relationship still needs the trainee's acceptance in the existing flow.
-- Registered accounts are identified by immutable Auth ID, never a row index.
create or replace function public.chat_set_user_role(p_user_id uuid, p_role text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v_email text;
begin
  if not public.chat_is_owner() then raise exception 'owner_only' using errcode = '42501'; end if;
  if p_role is null or p_role not in ('user', 'coach', 'doctor') then raise exception 'invalid_role'; end if;
  select lower(email) into v_email from auth.users where id = p_user_id;
  if not found then raise exception 'account_not_found'; end if;
  if p_role = 'coach' and nullif(v_email, '') is null then raise exception 'coach_email_required'; end if;
  perform pg_advisory_xact_lock(hashtext(p_user_id::text));
  if p_role = 'doctor' then
    delete from public.coach_grants where email = v_email;
    insert into public.chat_doctor_grants(user_id, granted_by) values(p_user_id, auth.uid()) on conflict(user_id) do nothing;
  elsif p_role = 'coach' then
    delete from public.chat_doctor_grants where user_id = p_user_id;
    insert into public.coach_grants(email, granted_by) values(v_email, auth.uid()) on conflict(email) do nothing;
  else
    delete from public.chat_doctor_grants where user_id = p_user_id;
    delete from public.coach_grants where email = v_email;
  end if;
  return jsonb_build_object('user_id', p_user_id, 'email', v_email, 'role', p_role);
end $$;

create or replace function public.chat_set_role(p_email text, p_role text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v_id uuid; v_email text := lower(btrim(p_email));
begin
  if not public.chat_is_owner() then raise exception 'owner_only' using errcode = '42501'; end if;
  select id into v_id from auth.users where lower(email) = v_email;
  if v_id is null then
    -- Preserve visibility and revocation of coach grants created before signup.
    if p_role = 'user' then
      delete from public.coach_grants where email = v_email;
      return jsonb_build_object('user_id', null, 'email', v_email, 'role', 'user');
    end if;
    raise exception 'account_not_found';
  end if;
  return public.chat_set_user_role(v_id, p_role);
end $$;

create or replace function public.chat_users(p_search text default '', p_role text default 'all',
  p_before_at timestamptz default null, p_before_id uuid default null) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare v_search text := lower(left(btrim(coalesce(p_search, '')), 120)); v_out jsonb;
begin
  if not public.chat_is_owner() then raise exception 'owner_only' using errcode = '42501'; end if;
  if p_role is null or p_role not in ('all','user','coach','doctor') then raise exception 'invalid_role'; end if;
  if (p_before_at is null) <> (p_before_id is null) then raise exception 'invalid_cursor'; end if;
  with accounts as materialized (
    select u.id user_id, u.email::text email, coalesce(u.created_at, 'epoch'::timestamptz) created_at, (u.created_at is not null) has_registered_at,
      coalesce(nullif(btrim(p.name),''), nullif(btrim(p.username),''), 'مستخدم')::text label,
      public.chat_role_for(u.id) role, (p.id is not null) has_profile,
      case when p.gender in ('male','female') then p.gender else null end gender,
      lower(coalesce(u.email,'') || ' ' || coalesce(p.name,'') || ' ' || coalesce(p.username,'')) search_text
    from auth.users u left join public.profiles p on p.id = u.id
  ), matches as materialized (
    select * from accounts a where (v_search = '' or strpos(a.search_text, v_search) > 0)
      and (p_role = 'all' or a.role = p_role)
  ), page as (
    select * from matches a where p_before_at is null or (a.created_at,a.user_id) < (p_before_at,p_before_id)
    order by a.created_at desc,a.user_id desc limit 51
  ), shown as (select * from page order by created_at desc,user_id desc limit 50)
  select jsonb_build_object(
    'users', coalesce((select jsonb_agg(to_jsonb(s) - 'search_text' order by s.created_at desc,s.user_id desc) from shown s),'[]'::jsonb),
    'has_more', (select count(*) > 50 from page), 'matching_count', (select count(*) from matches),
    'counts', jsonb_build_object('registered',(select count(*) from accounts),
      'missing_profiles',(select count(*) from accounts where not has_profile),
      'doctors',(select count(*) from accounts where role='doctor'),
      'coaches',(select count(*) from accounts where role='coach'),
      'legacy_coaches',(select count(*) from public.coach_grants g where not exists(select 1 from auth.users u where lower(u.email)=g.email)))
  ) into v_out;
  return v_out;
end $$;

-- Exact owner statistics without broadening profile-table RLS.
create or replace function public.chat_owner_stats() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.chat_is_owner() then raise exception 'owner_only' using errcode = '42501'; end if;
  return (select jsonb_build_object('total',count(*),
    'week',count(*) filter(where member_since >= current_date - 7),
    'female',count(*) filter(where gender='female'),
    'male',count(*) filter(where gender='male')) from public.profiles);
end $$;

create or replace function public.chat_legacy_coaches(p_after_email text default null)
returns table(email text, created_at timestamptz)
language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.chat_is_owner() then raise exception 'owner_only' using errcode = '42501'; end if;
  return query select g.email,g.created_at from public.coach_grants g
    where not exists(select 1 from auth.users u where lower(u.email)=g.email)
      and (p_after_email is null or g.email > p_after_email)
    order by g.email limit 50;
end $$;

-- Close the legacy direct-grant route, including old cached owner screens.
-- Existing grant rows/accepted relationships are preserved, not migrated or auto-consented.
drop policy if exists "coach_grants: admin all" on public.coach_grants;
create policy "coach_grants: admin all" on public.coach_grants for all to authenticated
  using (public.chat_is_owner()) with check (public.chat_is_owner());
revoke insert, update, delete on public.coach_grants from authenticated;

revoke all on function public.chat_is_owner(), public.chat_has_consent(), public.chat_role_for(uuid),
  public.chat_link_active(uuid,uuid,text), public.chat_bootstrap(), public.chat_accept_terms(text),
  public.chat_contacts(text,uuid), public.chat_start(uuid,text), public.chat_inbox(uuid,timestamptz,uuid), public.chat_send(uuid,text,uuid),
  public.chat_mark_read(uuid,bigint), public.chat_set_role(text,text), public.chat_users(text,text,timestamptz,uuid), public.chat_owner_stats(), public.chat_legacy_coaches(text), public.chat_set_user_role(uuid,text) from public, anon, authenticated;
grant execute on function public.chat_is_owner(), public.chat_has_consent(), public.chat_bootstrap(),
  public.chat_accept_terms(text), public.chat_contacts(text,uuid), public.chat_start(uuid,text), public.chat_inbox(uuid,timestamptz,uuid),
  public.chat_send(uuid,text,uuid), public.chat_mark_read(uuid,bigint), public.chat_set_role(text,text),
  public.chat_users(text,text,timestamptz,uuid), public.chat_owner_stats(), public.chat_legacy_coaches(text), public.chat_set_user_role(uuid,text) to authenticated;

-- Realtime remains subject to SELECT RLS. If publication isn't enabled, manual refresh works.
do $$ begin
  if exists(select 1 from pg_publication where pubname = 'supabase_realtime') then
    if not exists(select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'chat_messages') then
      alter publication supabase_realtime add table public.chat_messages;
    end if;
    if not exists(select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'chat_conversations') then
      alter publication supabase_realtime add table public.chat_conversations;
    end if;
  end if;
end $$;
notify pgrst, 'reload schema';
commit;
