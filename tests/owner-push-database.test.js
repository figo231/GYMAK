// @vitest-environment node
import{beforeAll,afterAll,it,expect}from'vitest';import{PGlite}from'@electric-sql/pglite';import{readFileSync}from'node:fs';
let db;const owner='00000000-0000-4000-8000-000000000001',a='00000000-0000-4000-8000-000000000002',b='00000000-0000-4000-8000-000000000003';let delivery;
async function actor(id,sql,role='authenticated'){await db.exec('begin;set local role '+role);try{await db.query("select set_config('request.jwt.claim.sub',$1,true)",[id]);const r=await db.query(sql);await db.exec('commit');return r.rows;}catch(e){await db.exec('rollback');throw e;}}
beforeAll(async()=>{db=new PGlite();await db.exec(`create role authenticated;create role anon;create role service_role;create schema auth;grant usage on schema public,auth to authenticated,anon;create table auth.users(id uuid primary key);create function auth.uid()returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;create function chat_is_owner()returns boolean language sql stable as $$select auth.uid()='${owner}'::uuid$$;create table profiles(id uuid,name text,username text);create table push_tokens(id uuid primary key default gen_random_uuid(),token text default 'fixture-token',user_id uuid,device_id text,platform text,is_active boolean,last_seen timestamptz default now());create table push_preferences(user_id uuid,category text,enabled boolean);insert into auth.users values('${owner}'),('${a}'),('${b}');insert into profiles values('${owner}','Owner','owner'),('${a}','User A','user_a'),('${b}','User B','user_b');insert into push_tokens(user_id,device_id,platform,is_active)values('${owner}','owner-device','android',true),('${a}','a-device','android',true),('${b}','b-device','android',true);insert into push_preferences values('${b}','announcement',false);`+readFileSync('supabase/migrations/0030_owner_notification_delivery.sql','utf8'));});afterAll(async()=>db.close());
it('owner-only directory/history; direct campaign data denied to everyone',async()=>{for(const id of[a,b])for(const q of["select owner_push_users('')",'select owner_push_history()'])await expect(actor(id,q)).rejects.toThrow('owner_only');for(const id of[owner,a])await expect(actor(id,'select * from owner_push_devices')).rejects.toThrow(/permission denied/);expect((await actor(owner,"select owner_push_users('') p"))[0].p.users).toHaveLength(3);});
it('all includes owner but excludes explicit opt-out; review cannot send',async()=>{const r=(await actor(owner,`select owner_push_review('Title','Body','all','{}','${owner}') p`))[0].p;expect(r.devices).toBe(2);expect(r.accounts).toBe(2);expect(r.send_enabled).toBe(false);delivery=(await db.query(`select id from owner_push_devices where user_id='${a}'`)).rows[0].id;expect((await db.query('select distinct state from owner_push_devices')).rows[0].state).toBe('pending');});
it('selected snapshots only requested eligible accounts and rejects stale identity',async()=>{const r=(await actor(owner,`select owner_push_review('Title','Body','selected',array['${a}']::uuid[],'${owner}') p`))[0].p;expect(r.devices).toBe(1);await expect(actor(owner,`select owner_push_review('Title','Body','all','{}','${a}')`)).rejects.toThrow('session_changed');await expect(actor(a,`select owner_push_review('Title','Body','all','{}','${a}')`)).rejects.toThrow('owner_only');});
it('ack requires accepted delivery and matching account/device; idempotent, no cross-account leaks',async()=>{await expect(actor(a,`select ack_owner_push('${delivery}','a-device','received')`)).rejects.toThrow('device_delivery_required');await db.exec(`update owner_push_devices set state='accepted' where id='${delivery}'`);await expect(actor(b,`select ack_owner_push('${delivery}','a-device','received')`)).rejects.toThrow('device_delivery_required');await expect(actor(a,`select ack_owner_push('${delivery}','b-device','received')`)).rejects.toThrow('device_delivery_required');for(let i=0;i<2;i++)await actor(a,`select ack_owner_push('${delivery}','a-device','received')`);expect((await db.query('select count(*) n from owner_push_events')).rows[0].n).toBe(1);});
it('starts paused, explicitly queues once, consumes atomically, and never retries unknown outcomes',async()=>{
 let r=(await actor(owner,`select owner_push_review('Worker','Body','selected',array['${a}']::uuid[],'${owner}') p`))[0].p;
 await expect(actor(owner,`select owner_push_confirm('${r.campaign_id}','${owner}')`)).rejects.toThrow('sending_paused');
 await db.exec('update owner_push_control set enabled=true');
 await actor(owner,`select owner_push_confirm('${r.campaign_id}','${owner}')`);await actor(owner,`select owner_push_confirm('${r.campaign_id}','${owner}')`);
 await expect(actor(a,`select claim_owner_push('${r.campaign_id}')`)).rejects.toThrow(/permission denied/);
 const p=(await db.query(`select claim_owner_push('${r.campaign_id}') p`)).rows[0].p;expect(p.token).toBe('fixture-token');
 expect((await db.query(`select claim_owner_push('${r.campaign_id}') p`)).rows[0].p).toBeNull();
 expect((await db.query('select state from owner_push_devices where id=$1',[p.delivery_id])).rows[0].state).toBe('outcome_unknown');
 await actor(a,`select ack_owner_push('${p.delivery_id}','a-device','opened')`);
 await db.query("select finish_owner_push($1,'accepted','fixture-provider',null)",[p.delivery_id]);
 expect((await db.query('select opened_at is not null as opened from owner_push_devices where id=$1',[p.delivery_id])).rows[0].opened).toBe(true);
});
it('rechecks opt-outs and kill switch after review before claiming any token',async()=>{
 const r=(await actor(owner,`select owner_push_review('Opt out','Body','selected',array['${a}']::uuid[],'${owner}') p`))[0].p;
 await actor(owner,`select owner_push_confirm('${r.campaign_id}','${owner}')`);
 await db.query("insert into push_preferences values($1,'announcement',false)",[a]);
 expect((await db.query(`select claim_owner_push('${r.campaign_id}') p`)).rows[0].p).toEqual({skipped:true});
 await actor(owner,'select pause_owner_push()');expect((await db.query(`select claim_owner_push('${r.campaign_id}') p`)).rows[0].p).toBeNull();
});
it('paginates the full owner directory without silently dropping accounts at500',async()=>{
 await db.exec("insert into auth.users(id) select gen_random_uuid() from generate_series(1,205)");
 let after=null,seen=[];for(let i=0;i<4;i++){const arg=after?`'${after}'`:'null';const r=(await actor(owner,`select owner_push_users('',${arg}) p`))[0].p;seen.push(...r.users.map(x=>x.user_id));if(!r.has_more)break;after=r.users.at(-1).user_id;}
 expect(seen).toHaveLength(208);expect(new Set(seen).size).toBe(208);
});
it('web migration includes recent web tokens in review and claim with the same opt-out rules',async()=>{
 await db.exec(readFileSync('supabase/migrations/0050_owner_web_push.sql','utf8'));
 await db.exec(`insert into push_tokens(user_id,device_id,platform,is_active) values('${owner}','owner-web','web',true),('${b}','opted-out-web','web',true)`);
 const r=(await actor(owner,`select owner_push_review('Web','Body','selected',array['${owner}']::uuid[],'${owner}') p`))[0].p;
 expect(r.devices).toBe(2);
 await db.exec('update owner_push_control set enabled=true');await actor(owner,`select owner_push_confirm('${r.campaign_id}','${owner}')`);
 let count=0;for(let i=0;i<3;i++){const x=(await db.query(`select claim_owner_push('${r.campaign_id}') p`)).rows[0].p;if(x&&!x.skipped)count++;}expect(count).toBe(2);
});
