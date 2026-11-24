begin;
-- Extend existing campaign eligibility, preserving owner checks, opt-outs,
-- kill switch and one-attempt behavior. No new send is queued by this migration.
create or replace function public.owner_push_users(p_query text default '',p_after uuid default null) returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
begin
 if not public.chat_is_owner() then raise exception 'owner_only';end if;
 return jsonb_build_object('users',coalesce((select jsonb_agg(x) from (select u.id user_id,coalesce(nullif(p.name,''),'Account') label,coalesce(p.username,'') username,
 (select count(*) from public.push_tokens t where t.user_id=u.id and t.is_active and t.platform in ('android','web') and t.last_seen>now()-interval '30 days') devices
 from auth.users u left join public.profiles p on p.id=u.id
 where (coalesce(p.name,'') ilike '%'||left(p_query,80)||'%' or coalesce(p.username,'') ilike '%'||left(p_query,80)||'%') and (p_after is null or u.id>p_after) order by u.id limit 100)x),'[]'),
 'has_more',(select count(*)>100 from auth.users u left join public.profiles p on p.id=u.id where (coalesce(p.name,'') ilike '%'||left(p_query,80)||'%' or coalesce(p.username,'') ilike '%'||left(p_query,80)||'%') and (p_after is null or u.id>p_after)));

end $$;
create or replace function public.owner_push_review(p_title text,p_body text,p_audience text,p_users uuid[],p_expected_user uuid) returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
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
 where t.is_active and t.platform in ('android','web') and t.last_seen>now()-interval '30 days'
 and (p_audience='all' or t.user_id=any(p_users))
 and not exists(select 1 from public.push_preferences pp where pp.user_id=t.user_id and pp.category='announcement' and not pp.enabled);
 get diagnostics n=row_count;
 return jsonb_build_object('campaign_id',cid,'devices',n,'accounts',(select count(distinct user_id) from public.owner_push_devices where campaign_id=cid),'send_enabled',(select enabled from public.owner_push_control where id));
end $$;
create or replace function public.claim_owner_push(p_campaign uuid) returns jsonb language plpgsql security definer set search_path='' as $$
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
 and t.is_active and t.platform in ('android','web') and t.last_seen>now()-interval '30 days'
 and not exists(select 1 from public.push_preferences pp where pp.user_id=d.user_id and pp.category='announcement' and not pp.enabled);
 update public.owner_push_devices set state=case when result is null then 'skipped' else 'outcome_unknown' end,claim_at=now() where id=d.id;
 return coalesce(result,jsonb_build_object('skipped',true));
end $$;
commit;
