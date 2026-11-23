begin;
-- Review only. Requires 0029; no production application authorized.
create table public.owner_push_campaigns(
 id uuid primary key default gen_random_uuid(),owner_id uuid not null references auth.users(id),
 title text not null check(char_length(title) between 1 and 120),body text not null check(char_length(body) between 1 and 1000),
 audience text not null check(audience in('all','selected')),state text not null default 'review' check(state in('review','queued','closed')),
 created_at timestamptz not null default now()
);
create table public.owner_push_devices(
 id uuid primary key default gen_random_uuid(),campaign_id uuid not null references public.owner_push_campaigns(id) on delete cascade,
 user_id uuid not null references auth.users(id) on delete cascade,token_id uuid references public.push_tokens(id) on delete set null,
 state text not null default 'pending' check(state in('pending','attempting','accepted','failed','invalid_token','unconfirmed','skipped','outcome_unknown')),
 provider_id text,error_code text,accepted_at timestamptz,received_at timestamptz,opened_at timestamptz,
 claim_at timestamptz,device_id text not null,unique(campaign_id,token_id)
);
create table public.owner_push_events(
 device_delivery uuid not null references public.owner_push_devices(id) on delete cascade,
 kind text not null check(kind in('received','opened')),created_at timestamptz not null default now(),primary key(device_delivery,kind)
);
alter table public.owner_push_campaigns enable row level security;
alter table public.owner_push_devices enable row level security;
alter table public.owner_push_events enable row level security;
revoke all on public.owner_push_campaigns,public.owner_push_devices,public.owner_push_events from public,anon,authenticated;
grant all on public.owner_push_campaigns,public.owner_push_devices,public.owner_push_events to service_role;
create table public.owner_push_control(id boolean primary key default true check(id),enabled boolean not null default false);
insert into public.owner_push_control values(true,false);
alter table public.owner_push_control enable row level security;
revoke all on public.owner_push_control from public,anon,authenticated;
grant all on public.owner_push_control to service_role;
create function public.owner_push_users(p_query text default '',p_after uuid default null) returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
begin
 if not public.chat_is_owner() then raise exception 'owner_only';end if;
 return jsonb_build_object('users',coalesce((select jsonb_agg(x) from (select u.id user_id,coalesce(nullif(p.name,''),'Account') label,coalesce(p.username,'') username,
 (select count(*) from public.push_tokens t where t.user_id=u.id and t.is_active and t.platform='android' and t.last_seen>now()-interval '30 days') devices
 from auth.users u left join public.profiles p on p.id=u.id
 where (coalesce(p.name,'') ilike '%'||left(p_query,80)||'%' or coalesce(p.username,'') ilike '%'||left(p_query,80)||'%') and (p_after is null or u.id>p_after) order by u.id limit 100)x),'[]'),
 'has_more',(select count(*)>100 from auth.users u left join public.profiles p on p.id=u.id where (coalesce(p.name,'') ilike '%'||left(p_query,80)||'%' or coalesce(p.username,'') ilike '%'||left(p_query,80)||'%') and (p_after is null or u.id>p_after)));

end $$;
-- Bounded review snapshot only. No send RPC is exposed in this migration draft.
-- All includes the owner's account normally. No automatic topic fallback.
create function public.owner_push_review(p_title text,p_body text,p_audience text,p_users uuid[],p_expected_user uuid) returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare cid uuid;n int;
begin
 if not public.chat_is_owner() then raise exception 'owner_only';end if;
 if auth.uid() is distinct from p_expected_user then raise exception 'session_changed';end if;
 if p_audience not in('all','selected') or p_audience is null then raise exception 'invalid_audience';end if;
 if p_audience='selected' and (coalesce(cardinality(p_users),0)=0 or cardinality(p_users)>500) then raise exception 'invalid_selection';end if;
 if char_length(trim(p_title)) not between 1 and 120 or char_length(trim(p_body)) not between 1 and 1000 or p_title is null or p_body is null then raise exception 'invalid_content';end if;
 if (select count(*) from public.owner_push_campaigns where owner_id=auth.uid() and created_at>now()-interval '1 hour')>=20 then raise exception 'review_rate_limit';end if;
 insert into public.owner_push_campaigns(owner_id,title,body,audience) values(auth.uid(),trim(p_title),trim(p_body),p_audience) returning id into cid;
 insert into public.owner_push_devices(campaign_id,user_id,token_id,device_id)
 select cid,t.user_id,t.id,t.device_id from public.push_tokens t
 where t.is_active and t.platform='android' and t.last_seen>now()-interval '30 days'
 and (p_audience='all' or t.user_id=any(p_users))
 and not exists(select 1 from public.push_preferences pp where pp.user_id=t.user_id and pp.category='announcement' and not pp.enabled);
 get diagnostics n=row_count;
 return jsonb_build_object('campaign_id',cid,'devices',n,'accounts',(select count(distinct user_id) from public.owner_push_devices where campaign_id=cid),'send_enabled',(select enabled from public.owner_push_control where id));
end $$;
create function public.owner_push_history() returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
begin
 if not public.chat_is_owner() then raise exception 'owner_only';end if;
 return coalesce((select jsonb_agg(x) from(select c.id,c.title,c.state,c.created_at,
 (select coalesce(jsonb_agg(jsonb_build_object('id',d.id,'label',coalesce(nullif(p.name,''),'Account'),'state',d.state,'accepted_at',d.accepted_at,'received_at',d.received_at,'opened_at',d.opened_at)),'[]') from public.owner_push_devices d left join public.profiles p on p.id=d.user_id where campaign_id=c.id) devices
 from public.owner_push_campaigns c order by c.created_at desc limit 30)x),'[]');
end $$;
-- Signed-in device owns both token row and delivery recipient. Cannot read
-- campaigns, acknowledge another account, or acknowledge an unsent review.
create function public.ack_owner_push(p_delivery uuid,p_device text,p_kind text) returns void language plpgsql security definer set search_path=public,pg_temp as $$
begin
 if auth.uid() is null then raise exception 'sign_in_required';end if;
 if p_kind not in('received','opened') or p_kind is null then raise exception 'invalid_event';end if;
 if not exists(select 1 from public.owner_push_devices d join public.push_tokens t on t.id=d.token_id where d.id=p_delivery and d.user_id=auth.uid() and t.user_id=auth.uid() and t.device_id=p_device and d.device_id=p_device and t.is_active and d.state in('outcome_unknown','accepted','unconfirmed')) then raise exception 'device_delivery_required';end if;
 insert into public.owner_push_events values(p_delivery,p_kind,now()) on conflict do nothing;
 if p_kind='received' then update public.owner_push_devices set received_at=coalesce(received_at,now()) where id=p_delivery;
 else update public.owner_push_devices set opened_at=coalesce(opened_at,now()) where id=p_delivery;end if;
end $$;
revoke all on function public.owner_push_users(text,uuid),public.owner_push_review(text,text,text,uuid[],uuid),public.owner_push_history(),public.ack_owner_push(uuid,text,text) from public,anon,authenticated;
grant execute on function public.owner_push_users(text,uuid),public.owner_push_review(text,text,text,uuid[],uuid),public.owner_push_history(),public.ack_owner_push(uuid,text,text) to authenticated;


-- Review is immutable; explicit owner confirmation queues the exact stored snapshot.
create function public.owner_push_confirm(p_campaign uuid,p_expected_user uuid) returns jsonb language plpgsql security definer set search_path='' as $$
declare c public.owner_push_campaigns;
begin
 if not public.chat_is_owner() or auth.uid() is distinct from p_expected_user then raise exception 'owner_only';end if;
 if not exists(select 1 from public.owner_push_control where id and enabled) then raise exception 'sending_paused';end if;
 select * into c from public.owner_push_campaigns where id=p_campaign and owner_id=auth.uid() for update;
 if not found then raise exception 'campaign_not_found';end if;
 if c.state='queued' or c.state='closed' then return jsonb_build_object('id',c.id,'state',c.state);end if;
 if c.created_at<now()-interval '10 minutes' then raise exception 'review_expired';end if;
 if not exists(select 1 from public.owner_push_devices where campaign_id=c.id) then raise exception 'no_eligible_devices';end if;
 update public.owner_push_campaigns set state='queued' where id=c.id;
 return jsonb_build_object('id',c.id,'state','queued');
end $$;
create function public.pause_owner_push() returns void language plpgsql security definer set search_path='' as $$
begin
 if not public.chat_is_owner() then raise exception 'owner_only';end if;
 update public.owner_push_control set enabled=false where id;
 update public.owner_push_devices set state='skipped' where state='pending';
 update public.owner_push_campaigns set state='closed' where state='queued';
end $$;
-- Atomic bounded consume BEFORE network. Unknown outcome is never auto-retried.
create function public.claim_owner_push(p_campaign uuid) returns jsonb language plpgsql security definer set search_path='' as $$
declare d public.owner_push_devices; c public.owner_push_campaigns; result jsonb;
begin
 if not exists(select 1 from public.owner_push_control where id and enabled) then return null;end if;
 select * into c from public.owner_push_campaigns where id=p_campaign and state='queued';
 if not found then return null;end if;
 select * into d from public.owner_push_devices where campaign_id=c.id and state='pending' order by id for update skip locked limit 1;
 if not found then
  update public.owner_push_campaigns set state='closed' where id=c.id;
  return null;
 end if;
 select jsonb_build_object('delivery_id',d.id,'user_id',d.user_id,'token',t.token,'title',c.title,'body',c.body,'notificationId',d.id)
 into result from public.push_tokens t where t.id=d.token_id and t.user_id=d.user_id and t.device_id=d.device_id
 and t.is_active and t.platform='android' and t.last_seen>now()-interval '30 days'
 and not exists(select 1 from public.push_preferences pp where pp.user_id=d.user_id and pp.category='announcement' and not pp.enabled);
 update public.owner_push_devices set state=case when result is null then 'skipped' else 'outcome_unknown' end,claim_at=now() where id=d.id;
 return coalesce(result,jsonb_build_object('skipped',true));
end $$;
create function public.finish_owner_push(p_delivery uuid,p_state text,p_provider text default null,p_error text default null) returns void language plpgsql security definer set search_path='' as $$
begin
 if p_state not in('accepted','failed','invalid_token','outcome_unknown') or p_state is null then raise exception 'invalid_state';end if;
 update public.owner_push_devices set state=p_state,provider_id=left(p_provider,200),error_code=left(p_error,120),accepted_at=case when p_state='accepted' then now() else null end where id=p_delivery and state='outcome_unknown';
end $$;
revoke all on function public.owner_push_confirm(uuid,uuid),public.pause_owner_push(),public.claim_owner_push(uuid),public.finish_owner_push(uuid,text,text,text) from public,anon,authenticated;
grant execute on function public.owner_push_confirm(uuid,uuid),public.pause_owner_push() to authenticated;
grant execute on function public.claim_owner_push(uuid),public.finish_owner_push(uuid,text,text,text) to service_role;
notify pgrst,'reload schema';
commit;
