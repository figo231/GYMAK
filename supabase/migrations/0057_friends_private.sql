-- Preparation only. Private-by-default, mutual friendship, no automatic push.
begin;
create table public.friend_preferences(user_id uuid primary key references auth.users(id) on delete cascade,discoverable boolean not null default false,share_days boolean not null default false,share_streak boolean not null default false,share_volume boolean not null default false);
create table public.friend_links(requester uuid not null references auth.users(id) on delete cascade,target uuid not null references auth.users(id) on delete cascade,status text not null default 'pending' check(status in('pending','accepted')),created_at timestamptz not null default now(),primary key(requester,target),check(requester<>target));
create index friend_links_target on public.friend_links(target);
create unique index friend_pair on public.friend_links(least(requester,target),greatest(requester,target));
create table public.friend_cheers(sender uuid not null references auth.users(id) on delete cascade,recipient uuid not null references auth.users(id) on delete cascade,day date not null default (now() at time zone 'Africa/Cairo')::date,primary key(sender,recipient,day),check(sender<>recipient));
create table public.friend_request_events(user_id uuid not null references auth.users(id) on delete cascade,created_at timestamptz not null default now());
create index friend_request_recent on public.friend_request_events(user_id,created_at);
create index friend_cheers_recipient on public.friend_cheers(recipient,day);
alter table public.friend_request_events enable row level security;
revoke all on public.friend_request_events from public,anon,authenticated;
grant all on public.friend_request_events to service_role;
alter table public.friend_preferences enable row level security;
alter table public.friend_links enable row level security;
alter table public.friend_cheers enable row level security;
revoke all on public.friend_preferences,public.friend_links,public.friend_cheers from public,anon,authenticated;
grant all on public.friend_preferences,public.friend_links,public.friend_cheers to service_role;
create function public.friend_active(p_a uuid,p_b uuid) returns boolean language sql stable security definer set search_path='' as $$select exists(select 1 from public.friend_links where status='accepted' and ((requester=p_a and target=p_b) or (requester=p_b and target=p_a))) and not public.chat_blocked_between(p_a,p_b)$$;
-- Internal helper cannot be used as a third-party relationship oracle.
revoke all on function public.friend_active(uuid,uuid) from public,anon,authenticated;
create function public.friend_settings(p_discoverable boolean,p_days boolean,p_streak boolean,p_volume boolean) returns void language plpgsql security definer set search_path='' as $$begin
 if auth.uid() is null then raise exception 'sign_in_required';end if;
 if p_discoverable is null or p_days is null or p_streak is null or p_volume is null then raise exception 'invalid_preferences';end if;
 insert into public.friend_preferences values(auth.uid(),p_discoverable,p_days,p_streak,p_volume) on conflict(user_id) do update set discoverable=excluded.discoverable,share_days=excluded.share_days,share_streak=excluded.share_streak,share_volume=excluded.share_volume;
end$$;
create function public.friend_request(p_username text) returns void language plpgsql security definer set search_path='' as $$declare peer uuid;me uuid:=auth.uid();begin
 if me is null then raise exception 'sign_in_required';end if;
 if p_username is null or length(btrim(p_username))<3 or length(p_username)>40 then raise exception 'invalid_username';end if;
 perform pg_advisory_xact_lock(hashtextextended('gymak-friend-graph',0));
 if not exists(select 1 from public.friend_preferences where user_id=me and discoverable) then raise exception 'enable_friends_first';end if;
 delete from public.friend_request_events where user_id=me and created_at<=now()-interval '1 day';
 if (select count(*) from public.friend_request_events where user_id=me and created_at>now()-interval '1 day')>=20 then raise exception 'request_limit';end if;
 insert into public.friend_request_events(user_id) values(me);
 if (select count(*) from public.friend_links where me in(requester,target))>=200 then raise exception 'friend_limit';end if;
 select p.id into peer from public.profiles p join public.friend_preferences f on f.user_id=p.id and f.discoverable where lower(p.username)=lower(btrim(p_username)) and p.id<>me and not public.chat_blocked_between(me,p.id);
 if peer is null then return;end if;
 if (select count(*) from public.friend_links where peer in(requester,target))>=200 then return;end if;
 insert into public.friend_links(requester,target) values(me,peer) on conflict do nothing;
end$$;
create function public.friend_respond(p_peer uuid,p_accept boolean) returns void language plpgsql security definer set search_path='' as $$begin
 if auth.uid() is null then raise exception 'sign_in_required';end if;
 if p_accept is true then
  if public.chat_blocked_between(auth.uid(),p_peer) then raise exception 'member_unavailable';end if;
  update public.friend_links set status='accepted' where requester=p_peer and target=auth.uid() and status='pending';
  if not found then raise exception 'request_unavailable';end if;
 else delete from public.friend_links where (requester=auth.uid() and target=p_peer) or (target=auth.uid() and requester=p_peer);end if;
end$$;
create function public.friend_cheer(p_peer uuid) returns void language plpgsql security definer set search_path='' as $$begin
 if auth.uid() is null or not public.friend_active(auth.uid(),p_peer) then raise exception 'friend_unavailable';end if;
 insert into public.friend_cheers(sender,recipient) values(auth.uid(),p_peer) on conflict do nothing;
end$$;
create function public.friend_block(p_peer uuid) returns void language plpgsql security definer set search_path='' as $$begin
 if auth.uid() is null or p_peer is null or p_peer=auth.uid() then raise exception 'invalid_block';end if;
 if not exists(select 1 from public.friend_links where (requester=auth.uid() and target=p_peer) or (target=auth.uid() and requester=p_peer)) then raise exception 'friend_unavailable';end if;
 insert into public.chat_blocks(blocker_id,blocked_id) values(auth.uid(),p_peer) on conflict do nothing;
 delete from public.friend_links where (requester=auth.uid() and target=p_peer) or (target=auth.uid() and requester=p_peer);
end$$;
create function public.friend_snapshot() returns jsonb language plpgsql stable security definer set search_path='' as $$declare me uuid:=auth.uid();start_day date;end_day date;begin
 if me is null then raise exception 'sign_in_required';end if;
 start_day:=date_trunc('week',now() at time zone 'Africa/Cairo')::date;end_day:=(now() at time zone 'Africa/Cairo')::date;
 return jsonb_build_object('week_start',start_day,'as_of',now(),'settings',coalesce((select to_jsonb(f)-'user_id' from public.friend_preferences f where f.user_id=me),'{"discoverable":false,"share_days":false,"share_streak":false,"share_volume":false}'::jsonb),'links',coalesce((select jsonb_agg(jsonb_build_object('peer',p.id,'username',p.username,'status',l.status,'incoming',l.target=me)) from public.friend_links l join public.profiles p on p.id=case when l.requester=me then l.target else l.requester end where me in(l.requester,l.target) and not public.chat_blocked_between(me,p.id)),'[]'::jsonb),'board',coalesce((
 select jsonb_agg(jsonb_build_object('peer',p.id,'username',p.username,'days',case when f.share_days then (select count(*) from public.workout_days w where w.user_id=p.id and w.date between start_day and end_day) end,'streak',case when f.share_streak then (select coalesce(max(n),0) from (select count(*) n from (select date-row_number() over(order by date)::integer grp from public.workout_days where user_id=p.id and date between start_day and end_day) d group by grp) runs) end,'volume',case when f.share_volume then (select coalesce(sum(greatest(0,weight)*greatest(0,sets)*greatest(0,reps)),0) from public.exercise_logs e where e.user_id=p.id and e.date between start_day and end_day) end))
 from (select me user_id union select case when requester=me then target else requester end from public.friend_links where me in(requester,target) and status='accepted') members join public.friend_preferences f on f.user_id=members.user_id join public.profiles p on p.id=f.user_id where (p.id=me or public.friend_active(me,p.id)) and (f.share_days or f.share_streak or f.share_volume)
 ),'[]'::jsonb),'cheers',coalesce((select jsonb_agg(jsonb_build_object('username',p.username,'day',c.day)) from public.friend_cheers c join public.profiles p on p.id=c.sender where c.recipient=me and c.day>=start_day and public.friend_active(me,c.sender)),'[]'::jsonb));
end$$;
revoke all on function public.friend_settings(boolean,boolean,boolean,boolean),public.friend_request(text),public.friend_respond(uuid,boolean),public.friend_cheer(uuid),public.friend_block(uuid),public.friend_snapshot() from public,anon;
grant execute on function public.friend_settings(boolean,boolean,boolean,boolean),public.friend_request(text),public.friend_respond(uuid,boolean),public.friend_cheer(uuid),public.friend_block(uuid),public.friend_snapshot() to authenticated;
commit;
