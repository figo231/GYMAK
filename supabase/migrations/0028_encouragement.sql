-- Default-on only after APK18 first-run notice/device enrollment. Global off until approved.
-- No topic sends. No cron is created by this migration.
create table public.encouragement_preferences (
 user_id uuid primary key references auth.users(id) on delete cascade,
 enabled boolean not null default false,
 device_id text,
 updated_at timestamptz not null default now()
);
create table public.encouragement_config (
 id boolean primary key default true check(id),
 enabled boolean not null default false,
 local_time time not null default '12:00',
 timezone text not null default 'Africa/Cairo' check(timezone='Africa/Cairo'),
 approved_text_version text,
 updated_at timestamptz not null default now()
);
insert into public.encouragement_config(id) values(true);
create table public.encouragement_messages (
 id smallint primary key,
 title text not null check(char_length(title) between 1 and 120),
 body text not null check(char_length(body) between 1 and 1000)
);
insert into public.encouragement_messages values
 (1,'خطوة صغيرة النهارده','حتى خطوة بسيطة بتفرق. سجّل تمرينك لما تكون جاهز.'),
 (2,'شوف إنت وصلت لفين','بص على آخر أرقامك وخلي خطوتك الجاية مناسبة ليك.'),
 (3,'الاستمرار أهم من المثالية','يومك مش لازم يبقى كامل. حاجة بسيطة تحافظ بيها على عادتك كفاية.'),
 (4,'وقتك على قدك؟','اختار حركة مناسبة ليك، وخلي الراحة جزء من خطتك.');
create table public.encouragement_deliveries (
 id uuid primary key default gen_random_uuid(),
 user_id uuid references auth.users(id) on delete cascade,
 local_day date not null,
 token_id uuid references public.push_tokens(id) on delete set null,
 message_id smallint references public.encouragement_messages(id),
 status text not null default 'claimed' check(status in ('claimed','skipped','accepted','rejected','outcome_unknown')),
 claimed_at timestamptz not null default now(),
 completed_at timestamptz,
 unique(user_id,local_day)
);
alter table public.encouragement_preferences enable row level security;
alter table public.encouragement_config enable row level security;
alter table public.encouragement_messages enable row level security;
alter table public.encouragement_deliveries enable row level security;
revoke all on public.encouragement_preferences,public.encouragement_config,public.encouragement_messages,public.encouragement_deliveries from anon,authenticated;
grant all on public.encouragement_preferences,public.encouragement_config,public.encouragement_messages,public.encouragement_deliveries to service_role;

create function public.my_encouragement() returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
begin
 if auth.uid() is null then raise exception 'sign_in_required'; end if;
 return jsonb_build_object('enabled',coalesce((select enabled from public.encouragement_preferences where user_id=auth.uid()),true),'enrolled',exists(select 1 from public.encouragement_preferences where user_id=auth.uid()));
end $$;
create function public.set_my_encouragement(p_enabled boolean,p_device_id text default null,p_expected_user uuid default null) returns void language plpgsql security definer set search_path=public,pg_temp as $$
begin
 if auth.uid() is null then raise exception 'sign_in_required'; end if;
 if p_expected_user is distinct from auth.uid() then raise exception 'session_changed'; end if;
 if p_enabled is null then raise exception 'invalid_preference'; end if;
 -- Bind an explicit choice to one registered Android install, never all tokens.
 if p_enabled and exists(select 1 from public.push_preferences where user_id=auth.uid() and category='encouragement' and not enabled) then raise exception 'previous_opt_out'; end if;
 if p_enabled and not exists(select 1 from public.push_tokens where user_id=auth.uid() and device_id=p_device_id and platform='android' and is_active) then raise exception 'android_device_required'; end if;
 insert into public.encouragement_preferences(user_id,enabled,device_id) values(auth.uid(),p_enabled,case when p_enabled then p_device_id else null end)
 on conflict(user_id) do update set enabled=excluded.enabled,device_id=excluded.device_id,updated_at=now();
 if not p_enabled then update public.encouragement_deliveries set status='skipped',completed_at=now() where user_id=auth.uid() and status='claimed'; end if;
end $$;
-- Read-only preview. Owner cannot activate merely by previewing.
create function public.owner_encouragement_preview() returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
begin
 if not public.chat_is_owner() then raise exception 'owner_only'; end if;
 return jsonb_build_object('config',(select to_jsonb(c) from public.encouragement_config c),'messages',(select jsonb_agg(to_jsonb(m) order by id) from public.encouragement_messages m),'eligible_accounts',(select count(*) from public.encouragement_preferences p join public.push_tokens t on t.user_id=p.user_id and t.device_id=p.device_id where p.enabled and not exists(select 1 from public.push_preferences pp where pp.user_id=p.user_id and pp.category='encouragement' and not pp.enabled) and t.is_active and t.platform='android'));
end $$;
-- The kill switch has no symmetric activate RPC. Activation is a separate gate.
create function public.pause_encouragement() returns void language plpgsql security definer set search_path=public,pg_temp as $$
begin
 if not public.chat_is_owner() then raise exception 'owner_only'; end if;
 update public.encouragement_config set enabled=false,updated_at=now();
 update public.encouragement_deliveries set status='skipped',completed_at=now() where status='claimed';
end $$;
revoke all on function public.my_encouragement(),public.set_my_encouragement(boolean,text,uuid),public.owner_encouragement_preview(),public.pause_encouragement() from public,anon;
grant execute on function public.my_encouragement(),public.set_my_encouragement(boolean,text,uuid),public.owner_encouragement_preview(),public.pause_encouragement() to authenticated;
notify pgrst,'reload schema';

alter table public.encouragement_config add column approved_text_hash text;
create function public.encouragement_text_hash() returns text language sql stable security definer set search_path=public,pg_temp as $$
 select md5(string_agg(id::text||':'||title||':'||body,'|' order by id)) from public.encouragement_messages
$$;
create function public.set_encouragement_draft_time(p_time time) returns void language plpgsql security definer set search_path=public,pg_temp as $$
begin
 if not public.chat_is_owner() then raise exception 'owner_only'; end if;
 if p_time is null then raise exception 'invalid_time'; end if;
 update public.encouragement_config set local_time=p_time,enabled=false,approved_text_version=null,approved_text_hash=null,updated_at=now();
 update public.encouragement_deliveries set status='skipped',completed_at=now() where status='claimed';
end $$;
-- Only the dedicated service sender can claim. Request time/day cannot be supplied.
create function public.claim_encouragement() returns setof public.encouragement_deliveries language plpgsql security definer set search_path=public,pg_temp as $$
declare c public.encouragement_config; wall timestamp; day date; mid smallint;
begin
 delete from public.encouragement_deliveries where local_day < (now() at time zone 'Africa/Cairo')::date-90;
 select * into c from public.encouragement_config where id=true;
 wall:=clock_timestamp() at time zone 'Africa/Cairo';day:=wall::date;
 if not c.enabled or c.approved_text_version is distinct from 'encouragement-v1' or c.approved_text_hash is distinct from public.encouragement_text_hash() or wall < day+c.local_time or wall >= day+c.local_time+interval '15 minutes' then return; end if;
 select id into mid from public.encouragement_messages order by id offset (extract(doy from day)::int % (select count(*) from public.encouragement_messages)) limit 1;
 return query insert into public.encouragement_deliveries(user_id,local_day,token_id,message_id)
 select p.user_id,day,t.id,mid from public.encouragement_preferences p join public.push_tokens t on t.user_id=p.user_id and t.device_id=p.device_id
 where p.enabled and not exists(select 1 from public.push_preferences pp where pp.user_id=p.user_id and pp.category='encouragement' and not pp.enabled) and t.is_active and t.platform='android' and t.last_seen>now()-interval '7 days'
 and not exists(select 1 from public.encouragement_deliveries d where d.user_id=p.user_id and d.local_day=day)
 order by p.user_id limit 50 on conflict(user_id,local_day) do nothing returning *;
end $$;
-- Final authorization lookup immediately before FCM. Never returns stale token copies.
create function public.encouragement_send_payload(p_claim uuid) returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare d public.encouragement_deliveries;c public.encouragement_config;wall timestamp;result jsonb;
begin
 select * into d from public.encouragement_deliveries where id=p_claim and status='claimed' for update;
 if not found then return null; end if;
 select * into c from public.encouragement_config where id=true;
 wall:=clock_timestamp() at time zone 'Africa/Cairo';
 if not c.enabled or c.approved_text_version is distinct from 'encouragement-v1' or c.approved_text_hash is distinct from public.encouragement_text_hash() or d.claimed_at<now()-interval '2 minutes' or d.local_day<>wall::date or wall<wall::date+c.local_time or wall>=wall::date+c.local_time+interval '15 minutes' then
 update public.encouragement_deliveries set status='skipped',completed_at=now() where id=p_claim;return null;end if;
 select jsonb_build_object('token',t.token,'title',m.title,'body',m.body,'notificationId',d.id,'collapseKey','encouragement-'||d.local_day::text)
 into result from public.encouragement_preferences p join public.push_tokens t on t.user_id=p.user_id and t.device_id=p.device_id join public.encouragement_messages m on m.id=d.message_id
 where p.user_id=d.user_id and p.enabled and not exists(select 1 from public.push_preferences pp where pp.user_id=p.user_id and pp.category='encouragement' and not pp.enabled) and t.id=d.token_id and t.is_active and t.platform='android' and t.last_seen>now()-interval '7 days';
 -- Consume before network: timeouts, process death and duplicate invokes never retry.
 update public.encouragement_deliveries set status=case when result is null then 'skipped' else 'outcome_unknown' end,completed_at=now() where id=p_claim;
 return result;
end $$;
revoke all on function public.encouragement_text_hash(),public.claim_encouragement(),public.encouragement_send_payload(uuid),public.set_encouragement_draft_time(time) from public,anon,authenticated;
grant execute on function public.set_encouragement_draft_time(time) to authenticated;
grant execute on function public.encouragement_text_hash(),public.claim_encouragement(),public.encouragement_send_payload(uuid) to service_role;
