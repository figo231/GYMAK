-- Suggestions derive from the current verified role. Never change profile visibility or grants.
begin;
create table public.professional_audiences(user_id uuid primary key references auth.users(id) on delete cascade,audience text not null default 'all' check(audience in ('all','male','female')),updated_at timestamptz not null default now());
alter table public.professional_audiences enable row level security;
revoke all on public.professional_audiences from public,anon,authenticated;
grant all on public.professional_audiences to service_role;
create function public.professional_audience_owner(p_user_id uuid) returns text language plpgsql stable security definer set search_path='' as $$begin
 if not public.chat_is_owner() then raise exception 'owner_only' using errcode='42501';end if;
 return coalesce((select audience from public.professional_audiences where user_id=p_user_id),'all');end $$;
create function public.professional_audience_save(p_user_id uuid,p_audience text) returns void language plpgsql security definer set search_path='' as $$begin
 if not public.chat_is_owner() then raise exception 'owner_only' using errcode='42501';end if;
 if p_audience is null or p_audience not in ('all','male','female') or public.chat_role_for(p_user_id) not in ('coach','doctor') then raise exception 'invalid_audience';end if;
 insert into public.professional_audiences(user_id,audience) values(p_user_id,p_audience) on conflict(user_id) do update set audience=excluded.audience,updated_at=now();end $$;
create function public.professional_audience_allows(p_user_id uuid) returns boolean language sql stable security definer set search_path='' as $$
 select coalesce((select a.audience='all' or coalesce(a.audience=(select p.gender from public.profiles p where p.id=auth.uid()),false) from public.professional_audiences a where a.user_id=p_user_id),true)
$$;
revoke all on function public.professional_audience_owner(uuid),public.professional_audience_save(uuid,text),public.professional_audience_allows(uuid) from public,anon,authenticated;
grant execute on function public.professional_audience_owner(uuid),public.professional_audience_save(uuid,text) to authenticated;
create or replace function public.professional_directory(p_kind text default 'all',p_after_id uuid default null)
returns table(user_id uuid,name text,bio text,kind text,ready boolean,request_status text)
language plpgsql stable security definer set search_path='' as $$
begin
 if p_kind is null or p_kind not in ('all','coach','doctor') then raise exception 'invalid_filter'; end if;
 return query select v.user_id,
 left(coalesce(case when cp.visible then nullif(btrim(cp.display_name),'') end,nullif(btrim(p.name),''),nullif(btrim(p.username),''),'مستخدم'),80),
 case when cp.visible then coalesce(cp.bio,'') else '' end,
 public.chat_role_for(v.user_id),
 exists(select 1 from public.chat_consents cs where cs.user_id=v.user_id and cs.version='2026-11-22-v1'),
 (select r.status from public.professional_requests r where r.client_id=auth.uid() and r.professional_id=v.user_id and r.kind=public.chat_role_for(v.user_id))
 from public.chat_verifications v join auth.users u on u.id=v.user_id
 left join public.profiles p on p.id=v.user_id left join public.chat_profiles cp on cp.user_id=v.user_id
 where public.professional_audience_allows(v.user_id) and public.chat_role_for(v.user_id) in ('coach','doctor')
 and (p_kind='all' or public.chat_role_for(v.user_id)=p_kind)
 and (p_after_id is null or v.user_id>p_after_id)
 and (auth.uid() is null or not public.chat_blocked_between(auth.uid(),v.user_id))
 order by v.user_id limit 50;
end $$;
create or replace function public.professional_request_send(p_professional_id uuid,p_kind text) returns uuid
language plpgsql security definer set search_path='' as $$
declare v_me uuid:=auth.uid(); v_id uuid; v_status text; v_updated timestamptz; v_name text;
begin
 if v_me is null then raise exception 'not_authenticated' using errcode='42501'; end if;
 if not public.chat_has_consent() then raise exception 'consent_required' using errcode='42501'; end if;
 if v_me=p_professional_id or p_kind not in ('coach','doctor') or p_kind is null or public.chat_role_for(p_professional_id)<>p_kind then raise exception 'request_not_allowed' using errcode='42501'; end if;
 select left(coalesce(case when cp.visible then nullif(btrim(cp.display_name),'') end,nullif(btrim(p.name),''),nullif(btrim(p.username),''),'مستخدم'),80) into v_name
 from public.chat_verifications v join auth.users u on u.id=v.user_id left join public.profiles p on p.id=v.user_id left join public.chat_profiles cp on cp.user_id=v.user_id
 where v.user_id=p_professional_id and public.professional_audience_allows(v.user_id) and public.chat_role_for(v.user_id)=p_kind and not public.chat_blocked_between(v_me,v.user_id);
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

commit;
