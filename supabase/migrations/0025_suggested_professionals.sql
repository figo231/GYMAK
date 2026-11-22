-- Owner-authored suggestions. No role grants, emails, fitness access or pushes.
begin;
create table if not exists public.professional_cards (
  user_id uuid primary key references auth.users(id) on delete cascade,
  name text not null check(char_length(btrim(name)) between 1 and 80),
  bio text not null default '' check(char_length(bio)<=500),
  published boolean not null default false,
  updated_at timestamptz not null default now()
);
create table if not exists public.professional_requests (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references auth.users(id) on delete cascade,
  professional_id uuid not null references auth.users(id) on delete cascade,
  kind text not null check(kind in ('coach','doctor')),
  status text not null default 'pending' check(status in ('pending','accepted','declined','canceled')),
  client_label text not null,
  professional_label text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check(client_id<>professional_id),
  unique(client_id,professional_id,kind)
);
create index if not exists professional_requests_pro on public.professional_requests(professional_id,created_at desc,id desc);
create index if not exists professional_requests_client on public.professional_requests(client_id,created_at desc,id desc);
alter table public.professional_cards enable row level security;
alter table public.professional_requests enable row level security;
revoke all on public.professional_cards,public.professional_requests from public,anon,authenticated;
grant all on public.professional_cards,public.professional_requests to service_role;
-- Existing doctor conversations retain their previous authority, never create new conversations.
insert into public.professional_requests(client_id,professional_id,kind,status,client_label,professional_label,created_at)
select client_id,professional_id,kind,'accepted',client_label,professional_label,created_at from public.chat_conversations where kind='doctor'
on conflict do nothing;

create or replace function public.professional_card_save(p_user_id uuid,p_name text,p_bio text,p_published boolean) returns void
language plpgsql security definer set search_path='' as $$
begin
 if not public.chat_is_owner() then raise exception 'owner_only' using errcode='42501'; end if;
 if public.chat_role_for(p_user_id) not in ('coach','doctor') then raise exception 'professional_required'; end if;
 if p_name is null or char_length(btrim(p_name)) not between 1 and 80 or p_bio is null or char_length(p_bio)>500 or p_published is null then raise exception 'invalid_card'; end if;
 if position('@' in p_name||p_bio)>0 then raise exception 'card_no_email'; end if;
 insert into public.professional_cards(user_id,name,bio,published) values(p_user_id,btrim(p_name),btrim(p_bio),p_published)
 on conflict(user_id) do update set name=excluded.name,bio=excluded.bio,published=excluded.published,updated_at=now();
end $$;
create or replace function public.professional_card_owner(p_user_id uuid) returns jsonb
language plpgsql stable security definer set search_path='' as $$
begin
 if not public.chat_is_owner() then raise exception 'owner_only' using errcode='42501'; end if;
 return (select jsonb_build_object('name',name,'bio',bio,'published',published) from public.professional_cards where user_id=p_user_id);
end $$;

create or replace function public.professional_directory(p_kind text default 'all',p_after_id uuid default null)
returns table(user_id uuid,name text,bio text,kind text,ready boolean,request_status text)
language plpgsql stable security definer set search_path='' as $$
begin
 if p_kind is null or p_kind not in ('all','coach','doctor') then raise exception 'invalid_filter'; end if;
 return query select c.user_id,c.name,c.bio,public.chat_role_for(c.user_id),
 exists(select 1 from public.chat_consents cs where cs.user_id=c.user_id and cs.version='2026-11-22-v1'),
 (select r.status from public.professional_requests r where r.client_id=auth.uid() and r.professional_id=c.user_id and r.kind=public.chat_role_for(c.user_id))
 from public.professional_cards c
 where c.published and public.chat_role_for(c.user_id) in ('coach','doctor')
 and (p_kind='all' or public.chat_role_for(c.user_id)=p_kind)
 and (p_after_id is null or c.user_id>p_after_id)
 order by c.user_id limit 50;
end $$;

create or replace function public.professional_request_send(p_professional_id uuid,p_kind text) returns uuid
language plpgsql security definer set search_path='' as $$
declare v_me uuid:=auth.uid(); v_id uuid; v_status text; v_updated timestamptz; v_name text;
begin
 if v_me is null then raise exception 'not_authenticated' using errcode='42501'; end if;
 if not public.chat_has_consent() then raise exception 'consent_required' using errcode='42501'; end if;
 if v_me=p_professional_id or p_kind not in ('coach','doctor') or p_kind is null or public.chat_role_for(p_professional_id)<>p_kind then raise exception 'request_not_allowed' using errcode='42501'; end if;
 select name into v_name from public.professional_cards where user_id=p_professional_id and published;
 if not found or not exists(select 1 from public.chat_consents where user_id=p_professional_id and version='2026-11-22-v1') then raise exception 'request_not_allowed' using errcode='42501'; end if;
 perform pg_advisory_xact_lock(hashtext(v_me::text));
 select id,status,updated_at into v_id,v_status,v_updated from public.professional_requests where client_id=v_me and professional_id=p_professional_id and kind=p_kind for update;
 if v_status in ('pending','accepted') then return v_id; end if;
 -- A declined/canceled pair cannot be re-requested, avoiding repeated unwanted contact.
 if v_id is not null then raise exception 'request_closed'; end if;
 if (select count(*) from public.professional_requests where client_id=v_me and created_at>now()-interval '1 day')>=10 then raise exception 'chat_rate_limited'; end if;
 insert into public.professional_requests(client_id,professional_id,kind,client_label,professional_label)
 values(v_me,p_professional_id,p_kind,left(coalesce((select coalesce(nullif(btrim(name),''),nullif(btrim(username),'')) from public.profiles where id=v_me),'مستخدم'),80),v_name)
 returning id into v_id;
 return v_id;
end $$;

create or replace function public.professional_request_list(p_after_at timestamptz default null,p_after_id uuid default null)
returns table(id uuid,peer_id uuid,peer_label text,kind text,status text,incoming boolean,created_at timestamptz,available boolean)
language plpgsql stable security definer set search_path='' as $$
begin
 if auth.uid() is null then raise exception 'not_authenticated' using errcode='42501'; end if;
 if (p_after_at is null)<>(p_after_id is null) then raise exception 'invalid_cursor'; end if;
 return query select r.id,case when r.client_id=auth.uid() then r.professional_id else r.client_id end,
 case when r.client_id=auth.uid() then r.professional_label else r.client_label end,r.kind,r.status,r.professional_id=auth.uid(),r.created_at,
 public.chat_role_for(r.professional_id)=r.kind and exists(select 1 from public.chat_consents cs where cs.user_id=r.professional_id and cs.version='2026-11-22-v1')
 from public.professional_requests r where auth.uid() in (r.client_id,r.professional_id)
 and (p_after_at is null or (r.created_at,r.id)<(p_after_at,p_after_id)) order by r.created_at desc,r.id desc limit 50;
end $$;

create or replace function public.professional_request_answer(p_id uuid,p_action text) returns void
language plpgsql security definer set search_path='' as $$
declare v_r public.professional_requests; v_me uuid:=auth.uid();
begin
 if v_me is null then raise exception 'not_authenticated' using errcode='42501'; end if;
 select * into v_r from public.professional_requests where id=p_id and v_me in(client_id,professional_id) for update;
 if not found then raise exception 'request_not_allowed' using errcode='42501'; end if;
 if p_action in ('accept','decline') and v_me=v_r.professional_id and v_r.status='pending' then
  if p_action='accept' and (not public.chat_has_consent() or public.chat_role_for(v_me)<>v_r.kind) then raise exception 'request_not_allowed' using errcode='42501'; end if;
  update public.professional_requests set status=case when p_action='accept' then 'accepted' else 'declined' end,updated_at=now() where id=p_id;
  if p_action='accept' then
   insert into public.chat_conversations(client_id,professional_id,kind,client_label,professional_label)
   values(v_r.client_id,v_r.professional_id,v_r.kind,v_r.client_label,v_r.professional_label) on conflict(client_id,professional_id,kind) do nothing;
  end if;
 elsif p_action='cancel' and (v_me=v_r.client_id or v_r.status='accepted') and v_r.status in ('pending','accepted') then
  update public.professional_requests set status='canceled',updated_at=now() where id=p_id;
 else raise exception 'request_not_allowed' using errcode='42501'; end if;
end $$;

create or replace function public.chat_link_active(p_client uuid,p_professional uuid,p_kind text) returns boolean
language sql stable security definer set search_path='' as $$
 select public.chat_role_for(p_professional)=p_kind and exists(select 1 from public.chat_consents where user_id=p_professional and version='2026-11-22-v1')
 and ((p_kind='coach' and exists(select 1 from public.coach_links where coach_id=p_professional and trainee_id=p_client and status='active'))
 or (p_kind in ('coach','doctor') and exists(select 1 from public.professional_requests where client_id=p_client and professional_id=p_professional and kind=p_kind and status='accepted')));
$$;
create or replace function public.chat_contacts(p_after_kind text default null,p_after_id uuid default null)
returns table(user_id uuid,label text,kind text)
language plpgsql stable security definer set search_path='' as $$
begin
 if auth.uid() is null then raise exception 'not_authenticated' using errcode='42501'; end if;
 if not public.chat_has_consent() then raise exception 'consent_required' using errcode='42501'; end if;
 if (p_after_kind is null)<>(p_after_id is null) then raise exception 'invalid_cursor'; end if;
 return query select q.uid,coalesce(c.name,nullif(btrim(p.name),''),nullif(btrim(p.username),''),'مستخدم')::text,q.k
 from (select professional_id uid,r.kind k from public.professional_requests r where client_id=auth.uid() and status='accepted'
 union select coach_id,'coach'::text from public.coach_links where trainee_id=auth.uid() and status='active') q
 left join public.professional_cards c on c.user_id=q.uid left join public.profiles p on p.id=q.uid
 where q.uid<>auth.uid() and public.chat_link_active(auth.uid(),q.uid,q.k)
 and (p_after_kind is null or (q.k,q.uid)>(p_after_kind,p_after_id)) order by q.k,q.uid limit 50;
end $$;
revoke all on function public.professional_card_save(uuid,text,text,boolean),public.professional_card_owner(uuid),public.professional_directory(text,uuid),public.professional_request_send(uuid,text),public.professional_request_list(timestamptz,uuid),public.professional_request_answer(uuid,text) from public,anon,authenticated;
grant execute on function public.professional_directory(text,uuid) to anon,authenticated;
grant execute on function public.professional_card_save(uuid,text,text,boolean),public.professional_card_owner(uuid),public.professional_request_send(uuid,text),public.professional_request_list(timestamptz,uuid),public.professional_request_answer(uuid,text) to authenticated;
notify pgrst,'reload schema';
commit;
