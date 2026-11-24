// @vitest-environment node
import {beforeAll,afterAll,it,expect} from 'vitest';
import {PGlite} from '@electric-sql/pglite';
import {readFileSync} from 'node:fs';
const ids={client:'00000000-0000-4000-8000-000000000001',doctor:'00000000-0000-4000-8000-000000000002',other:'00000000-0000-4000-8000-000000000003'},thread='10000000-0000-4000-8000-000000000001';
let db;async function actor(id,sql,args=[],role='authenticated'){await db.exec('begin;set local role '+role);try{await db.query("select set_config('request.jwt.claim.sub',$1,true)",[ids[id]||'']);const r=await db.query(sql,args);await db.exec('commit');return r.rows;}catch(e){await db.exec('rollback');throw e;}}
const save=(who,request,expected=0,meals=[{name:'فطار',items:'بيضتين'}])=>actor(who,'select care_plan_save($1,$2,$3,$4,$5,$6,$7) id',[thread,'خطة أولى',JSON.stringify(meals),'ملاحظة','',request,expected]);
beforeAll(async()=>{db=new PGlite();await db.exec(`create role authenticated;create role anon;create role service_role;create schema auth;grant usage on schema public,auth to authenticated,anon;create table auth.users(id uuid primary key);create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;create table chat_conversations(id uuid primary key,client_id uuid,professional_id uuid,kind text);create table chat_messages(id uuid primary key default gen_random_uuid(),conversation_id uuid references chat_conversations(id) on delete cascade,body text,seq bigserial,created_at timestamptz default now());create table public.apk18_rollout_control(id boolean,chat_writes boolean);insert into public.apk18_rollout_control values(true,true);create table flags(active boolean,blocked boolean,consent boolean);insert into flags values(true,false,true);create function chat_has_consent_v2() returns boolean language sql as $$select consent from public.flags$$;create function chat_blocked_between(uuid,uuid) returns boolean language sql as $$select blocked from public.flags$$;create function chat_link_active_v2(uuid,uuid,text) returns boolean language sql as $$select active from public.flags$$;insert into auth.users values('${ids.client}'),('${ids.doctor}'),('${ids.other}');insert into chat_conversations values('${thread}','${ids.client}','${ids.doctor}','doctor');`+readFileSync('supabase/migrations/0033_care_plans.sql','utf8')+readFileSync('supabase/migrations/0034_chat_search_pins.sql','utf8')+readFileSync('supabase/migrations/0035_care_appointments.sql','utf8')+readFileSync('supabase/migrations/0036_care_training_history.sql','utf8'));});
afterAll(async()=>db.close());
it('only doctor in the thread can author, only participants can read; owner has no exception',async()=>{for(const who of ['client','other'])await expect(save(who,crypto.randomUUID())).rejects.toThrow(/doctor_only|chat_not_allowed/);await expect(actor('other','select care_plan_list($1)',[thread])).rejects.toThrow(/chat_not_allowed/);for(const role of ['authenticated','anon'])await expect(actor('doctor','select * from care_plan_versions',[],role)).rejects.toThrow(/permission denied/);});
it('keeps immutable versions, idempotent retries, checks stale editors and selects only same-thread version',async()=>{const a=crypto.randomUUID(),b=crypto.randomUUID();await save('doctor',a);expect((await save('doctor',a))[0].id).toBe(a);await expect(save('doctor',b,0)).rejects.toThrow(/plan_changed_refresh/);await save('doctor',b,1);const r=(await actor('client','select care_plan_list($1) p',[thread]))[0].p;expect(r.versions.map(v=>v.version)).toEqual([2,1]);expect(r.can_author).toBe(false);await actor('client','select care_plan_choose($1,$2)',[thread,a]);expect((await actor('doctor','select care_plan_list($1) p',[thread]))[0].p.selected_id).toBe(a);await expect(actor('doctor','select care_plan_choose($1,$2)',[thread,a])).rejects.toThrow(/plan_not_allowed/);await expect(actor('client','select care_plan_choose($1,$2)',[thread,crypto.randomUUID()])).rejects.toThrow(/plan_not_allowed/);});
it('rejects empty or malformed structured meals',async()=>{for(const m of [[],[{}],[{name:'x',items:''}],[{name:'x',items:123}],[{name:'x',items:'y'.repeat(601)}]])await expect(save('doctor',crypto.randomUUID(),2,m)).rejects.toThrow(/invalid_plan/);});
it('honors block, consent and revoked access without destroying history',async()=>{await db.exec('update flags set blocked=true');await expect(actor('client','select care_plan_list($1)',[thread])).rejects.toThrow(/chat_blocked/);await db.exec('update flags set blocked=false,active=false');await expect(save('doctor',crypto.randomUUID(),2)).rejects.toThrow(/chat_read_only/);expect((await actor('client','select care_plan_list($1) p',[thread]))[0].p.versions).toHaveLength(2);await db.exec('update flags set active=true,consent=false');await expect(actor('client','select care_plan_list($1)',[thread])).rejects.toThrow(/consent_required/);});

it('searches literal full history, pins privately and denies cross-thread access',async()=>{
 await db.exec('update flags set consent=true,active=true,blocked=false');
 await db.query("insert into chat_messages(conversation_id,body) select $1,'نصيحة % '||n from generate_series(1,60) n",[thread]);
 const rows=await actor('client','select * from care_chat_search($1,$2)',[thread,'%']);expect(rows).toHaveLength(50);
 const older=await actor('client','select * from care_chat_search($1,$2,$3)',[thread,'%',rows.at(-1).seq]);expect(older).toHaveLength(10);
 const mid=rows[0].id;await actor('client','select care_chat_pin($1,$2,true)',[thread,mid]);await actor('client','select care_chat_pin($1,$2,true)',[thread,mid]);
 expect(await actor('client','select * from care_chat_pins($1)',[thread])).toHaveLength(1);expect(await actor('doctor','select * from care_chat_pins($1)',[thread])).toHaveLength(0);
 await expect(actor('other','select * from care_chat_search($1,$2)',[thread,'%'])).rejects.toThrow(/chat_not_allowed/);
 await expect(actor('client','select care_chat_pin($1,$2,true)',[thread,crypto.randomUUID()])).rejects.toThrow(/message_not_allowed/);
 await expect(actor('client','select * from chat_personal_pins')).rejects.toThrow(/permission denied/);
 await actor('client','select care_chat_pin($1,$2,false)',[thread,mid]);expect(await actor('client','select * from care_chat_pins($1)',[thread])).toHaveLength(0);
});

it('free appointment request requires explicit professional acceptance and rejects overlaps/double booking',async()=>{
 const slot=crypto.randomUUID(),request=crypto.randomUUID(),start=new Date(Date.now()+86400000).toISOString();
 await expect(actor('client','select care_slot_add($1,$2,30,$3,$4)',[thread,start,'',slot])).rejects.toThrow(/professional_only/);
 await actor('doctor','select care_slot_add($1,$2,30,$3,$4)',[thread,start,'متابعة مجانية',slot]);
 await expect(actor('doctor','select care_slot_add($1,$2,30,$3,$4)',[thread,start,'',crypto.randomUUID()])).rejects.toThrow(/slot_overlap/);
 await actor('client','select care_appointment_request($1,$2,$3)',[thread,slot,request]);await actor('client','select care_appointment_request($1,$2,$3)',[thread,slot,request]);
 let r=(await actor('doctor','select care_appointments_list($1) p',[thread]))[0].p;expect(r.slots).toHaveLength(0);expect(r.appointments[0].status).toBe('pending');
 await expect(actor('client',"select care_appointment_answer($1,$2,'accept')",[thread,request])).rejects.toThrow(/request_not_allowed/);
 await expect(actor('client','select care_appointment_request($1,$2,$3)',[thread,slot,crypto.randomUUID()])).rejects.toThrow(/slot_unavailable/);
 await actor('doctor',"select care_appointment_answer($1,$2,'accept')",[thread,request]);
 expect((await actor('client','select care_appointments_list($1) p',[thread]))[0].p.appointments[0].status).toBe('accepted');
 await actor('client',"select care_appointment_answer($1,$2,'cancel')",[thread,request]);
 expect((await actor('doctor','select care_appointments_list($1) p',[thread]))[0].p.slots).toHaveLength(1);
 await actor('doctor','select care_slot_cancel($1,$2)',[thread,slot]);
 expect((await actor('client','select care_appointments_list($1) p',[thread]))[0].p.slots).toHaveLength(0);
 await expect(actor('other','select care_appointments_list($1)',[thread])).rejects.toThrow(/chat_not_allowed/);
});

it('keeps coach snapshots immutable and forbids wrong roles and stale edits',async()=>{
 const coachThread=crypto.randomUUID();await db.query("insert into chat_conversations values($1,$2,$3,'coach')",[coachThread,ids.client,ids.doctor]);
 const snap={program_id:'p1',name:'خطة قوة',days:[{title:'يوم1',exercises:[{id:'bench',name:'بنش',sets:3,reps:8}]}]},request=crypto.randomUUID();
 await expect(actor('client','select care_training_save($1,$2,$3,$4,0)',[coachThread,JSON.stringify(snap),'',request])).rejects.toThrow(/coach_only/);
 await actor('doctor','select care_training_save($1,$2,$3,$4,0)',[coachThread,JSON.stringify(snap),'البداية',request]);
 await actor('doctor','select care_training_save($1,$2,$3,$4,0)',[coachThread,JSON.stringify(snap),'البداية',request]);
 const newer={...snap,name:'خطة معدلة'};await actor('doctor','select care_training_save($1,$2,$3,$4,1)',[coachThread,JSON.stringify(newer),'تغيير الخطة',crypto.randomUUID()]);
 const list=(await actor('client','select care_training_list($1) p',[coachThread]))[0].p.versions;expect(list).toHaveLength(2);expect(list[1].snapshot.name).toBe('خطة قوة');expect(list[0].snapshot.name).toBe('خطة معدلة');
 await expect(actor('other','select care_training_list($1)',[coachThread])).rejects.toThrow(/chat_not_allowed/);
 await expect(actor('doctor','select care_training_save($1,$2,$3,$4,1)',[coachThread,JSON.stringify(newer),'',crypto.randomUUID()])).rejects.toThrow(/plan_changed_refresh/);
});

it('respects the existing chat pause for new shared writes',async()=>{
 await db.exec('update apk18_rollout_control set chat_writes=false');
 await expect(save('doctor',crypto.randomUUID(),2)).rejects.toThrow(/chat_paused/);
 expect((await actor('client','select care_plan_list($1) p',[thread]))[0].p.versions.length).toBeGreaterThan(0);
 await db.exec('update apk18_rollout_control set chat_writes=true');
});

it('keeps status and cancellation available after block or link revocation',async()=>{
 const slot=crypto.randomUUID(),req=crypto.randomUUID(),start=new Date(Date.now()+2*86400000).toISOString();
 await actor('doctor','select care_slot_add($1,$2,30,$3,$4)',[thread,start,'',slot]);
 await actor('client','select care_appointment_request($1,$2,$3)',[thread,slot,req]);
 await db.exec('update flags set blocked=true,active=false');
 expect((await actor('client','select care_appointments_list($1) p',[thread]))[0].p.appointments.find(a=>a.id===req).status).toBe('pending');
 await expect(actor('doctor',"select care_appointment_answer($1,$2,'accept')",[thread,req])).rejects.toThrow(/chat_blocked/);
 await actor('client',"select care_appointment_answer($1,$2,'cancel')",[thread,req]);
 expect((await actor('doctor','select care_appointments_list($1) p',[thread]))[0].p.appointments.find(a=>a.id===req).status).toBe('canceled');
 await db.exec('update flags set blocked=false,active=true');
});
it('account deletion cascades shared plans, selections, pins and appointment records',async()=>{
 await db.query('delete from auth.users where id=$1',[ids.client]);
 // Our fixture conversations intentionally omit auth FKs. Exercise the production conversation cascade explicitly.
 await db.query('delete from chat_conversations where client_id=$1',[ids.client]);
 for(const table of ['care_plan_versions','care_plan_choices','care_training_versions','care_appointments','chat_personal_pins'])expect((await db.query('select count(*)::int n from '+table)).rows[0].n).toBe(0);
});
