begin;
create table public.app_announcements (
 id uuid primary key default gen_random_uuid(),
 title text not null check(char_length(btrim(title)) between 1 and 120),
 body text not null check(char_length(btrim(body)) between 1 and 1000),
 created_by uuid references auth.users(id) on delete set null,
 created_at timestamptz not null default now(),
 expires_at timestamptz not null default now()+interval '30 days',
 active boolean not null default true,
 check(expires_at>created_at and expires_at<=created_at+interval '90 days')
);
create table public.app_announcement_dismissals (
 user_id uuid not null references auth.users(id) on delete cascade,
 announcement_id uuid not null references public.app_announcements(id) on delete cascade,
 dismissed_at timestamptz not null default now(),primary key(user_id,announcement_id)
);
alter table public.app_announcements enable row level security;
alter table public.app_announcement_dismissals enable row level security;
revoke all on public.app_announcements,public.app_announcement_dismissals from public,anon,authenticated;
grant select on public.app_announcements to authenticated;
create policy announcements_read on public.app_announcements for select to authenticated using(active and expires_at>now());
create function public.app_announcements_feed() returns setof public.app_announcements language sql stable security definer set search_path='' as $$
 select a.* from public.app_announcements a where auth.uid() is not null and a.active and a.expires_at>now()
 and not exists(select 1 from public.app_announcement_dismissals d where d.user_id=auth.uid() and d.announcement_id=a.id)
 order by a.created_at desc,a.id desc limit 20;
$$;
create function public.app_announcement_dismiss(p_id uuid) returns void language plpgsql security definer set search_path='' as $$begin
 if auth.uid() is null then raise exception 'not_authenticated';end if;
 if not exists(select 1 from public.app_announcements where id=p_id) then raise exception 'announcement_not_found';end if;
 insert into public.app_announcement_dismissals(user_id,announcement_id) values(auth.uid(),p_id) on conflict do nothing;
end $$;
create function public.owner_announcement_publish(p_title text,p_body text,p_days integer default 30) returns uuid language plpgsql security definer set search_path='' as $$declare result uuid;begin
 if not public.chat_is_owner() then raise exception 'owner_only';end if;
 if p_days is null or p_days not between 1 and 90 then raise exception 'invalid_duration';end if;
 if p_title is null or p_body is null then raise exception 'invalid_content';end if;
 if (select count(*) from public.app_announcements where created_by=auth.uid() and created_at>now()-interval '1 day')>=10 then raise exception 'announcement_rate_limit';end if;
 insert into public.app_announcements(title,body,created_by,expires_at) values(btrim(p_title),btrim(p_body),auth.uid(),now()+make_interval(days=>p_days)) returning id into result;
 return result;
end $$;
create function public.owner_announcement_hide(p_id uuid) returns void language plpgsql security definer set search_path='' as $$begin
 if not public.chat_is_owner() then raise exception 'owner_only';end if;
 update public.app_announcements set active=false where id=p_id;
end $$;
create function public.owner_announcements_list() returns setof public.app_announcements language plpgsql stable security definer set search_path='' as $$begin
 if not public.chat_is_owner() then raise exception 'owner_only';end if;
 return query select * from public.app_announcements order by created_at desc limit 50;
end $$;
revoke all on function public.app_announcements_feed(),public.app_announcement_dismiss(uuid),public.owner_announcement_publish(text,text,integer),public.owner_announcement_hide(uuid),public.owner_announcements_list() from public,anon,authenticated;
grant execute on function public.app_announcements_feed(),public.app_announcement_dismiss(uuid),public.owner_announcement_publish(text,text,integer),public.owner_announcement_hide(uuid),public.owner_announcements_list() to authenticated;
commit;
