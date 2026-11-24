// @vitest-environment node
import { beforeAll, beforeEach, afterAll, describe, expect, it } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { readFileSync } from "node:fs";
const chat = readFileSync("supabase/migrations/0024_private_chat.sql", "utf8");
const moderation = readFileSync("supabase/migrations/0027_ugc_terms_moderation.sql", "utf8");
const V1 = "2026-11-22-v1", V2 = "2026-11-23-tou-v1";
let db,installed=false;
const ids = Object.fromEntries(["owner","sender","client","doctor","coach","stranger","missing","phone"].map((n,i)=>[n,`00000000-0000-0000-0000-${String(i+1).padStart(12,"0")}`]));
const baseline = `
create schema public; create schema auth;
grant usage on schema public,auth to authenticated,anon,service_role;
create table auth.users(id uuid primary key,email text,created_at timestamptz default now());
create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
create function auth.jwt() returns jsonb language sql stable as $$select coalesce(nullif(current_setting('request.jwt.claims',true),''),'{}')::jsonb$$;
create table public.profiles(id uuid primary key references auth.users(id) on delete cascade,name text,username text,gender text,member_since date default current_date);
create table public.admin_users(user_id uuid primary key references auth.users(id),role text);
create table public.coach_grants(email text primary key,granted_by uuid references auth.users(id),created_at timestamptz default now());
create table public.coach_links(id uuid primary key default gen_random_uuid(),coach_id uuid references auth.users(id) on delete cascade,trainee_id uuid references auth.users(id) on delete cascade,status text);
create table public.feedback(id uuid primary key default gen_random_uuid(),user_id uuid references auth.users(id) on delete cascade,message text,admin_reply text);
alter table public.coach_grants enable row level security;
create function public.is_coach(uid uuid) returns boolean language sql stable security definer set search_path='' as $$select exists(select 1 from public.coach_grants g join auth.users u on lower(u.email)=g.email where u.id=uid)$$;
grant select on public.profiles,public.admin_users to authenticated;
grant all on public.coach_grants to authenticated;
`;
async function actor(id, fn, role="authenticated") {
  await db.exec(`begin; set local role ${role};`);
  try {
    await db.query("select set_config('request.jwt.claim.sub',$1,true)",[id || ""]);
    await db.query("select set_config('request.jwt.claims',$1,true)",[JSON.stringify({sub:id,email:Object.entries(ids).find(([,v])=>v===id)?.[0]+"@test.invalid"})]);
    const result=await fn(); await db.exec("commit"); return result;
  } catch(e) { await db.exec("rollback"); throw e; }
}
const query = async (sql,args=[]) => (await db.query(sql,args)).rows;
const rpc = async (user,name,args=[]) => actor(ids[user],async()=> {
 const mapped=['chat_has_consent','chat_accept_terms','chat_bootstrap','chat_link_active','chat_contacts','chat_start','chat_send','chat_inbox'].includes(name)&&installed?name+'_v2':name;
 const call=`public.${mapped}(${args.map((_,i)=>'$'+(i+1)).join(',')})`;
 const setof=["chat_inbox","chat_contacts","chat_legacy_coaches","chat_blocks_mine","moderation_reports_list"];
 const sql=setof.includes(name)?`select coalesce(jsonb_agg(x),'[]') result from ${call} x`:name==="chat_send"?`select to_jsonb(x) result from ${call} x`:`select ${call} result`;
 return (await query(sql,args))[0]?.result;
});
async function conversation(kind="doctor") { return rpc("client","chat_start",[ids[kind],kind]); }
async function consentAll() { for(const name of ["client","doctor","coach","owner","sender","stranger"])await rpc(name,"chat_accept_terms",[V2]); }
beforeAll(async()=>{db=new PGlite();await db.exec("create role authenticated; create role anon; create role service_role bypassrls;");});
afterAll(async()=>{await db?.close();});
beforeEach(async()=>{installed=false;
 await db.exec("drop schema if exists public cascade; drop schema if exists auth cascade;"+baseline);
 for(const [name,id] of Object.entries(ids)) await db.query("insert into auth.users(id,email) values($1,$2)",[id,name==='phone'?null:name+"@test.invalid"]);
 for(const [name,id] of Object.entries(ids).filter(([n])=>n!=="missing")) await db.query("insert into public.profiles(id,name,username) values($1,$2,$3)",[id,name,"u_"+name]);
 await db.query("insert into public.admin_users values($1,'super_admin'),($2,'sender')",[ids.owner,ids.sender]);
 await db.query("insert into public.coach_grants(email,granted_by) values('coach@test.invalid',$1)",[ids.owner]);
 await db.query("insert into public.coach_links(coach_id,trainee_id,status) values($1,$2,'active')",[ids.coach,ids.client]);
 await db.exec(chat);
 await rpc("owner","chat_set_user_role",[ids.doctor,"doctor"]);
 // Everyone accepts the original privacy-notice-only version, then 0027 lands.
 for(const name of ["client","doctor","coach","owner","sender","stranger"])await rpc(name,"chat_accept_terms",[V1]);
 await db.exec(moderation);await db.exec('update apk18_rollout_control set chat_writes=true');installed=true;
});

it('new care features integrate with real chat consent, roles, history and blocks',async()=>{
 await consentAll();
 for(const m of ['0033_care_plans.sql','0034_chat_search_pins.sql','0035_care_appointments.sql','0036_care_training_history.sql'])await db.exec(readFileSync('supabase/migrations/'+m,'utf8'));
 const id=await conversation(),nonce='10000000-0000-4000-8000-000000000001';
 const saved=await rpc('doctor','care_plan_save',[id,'خطة أولى',JSON.stringify([{name:'فطار',items:'بيضتين'}]),'','',nonce,0]);expect(saved).toBe(nonce);
 expect((await rpc('client','care_plan_list',[id])).versions).toHaveLength(1);
 expect((await rpc('doctor','care_plan_list',[id])).can_author).toBe(true);
 await expect(rpc('owner','care_plan_list',[id])).rejects.toThrow(/chat_not_allowed/);
 const message=await rpc('doctor','chat_send',[id,'نصيحة قديمة','10000000-0000-4000-8000-000000000002']);
 await rpc('client','care_chat_pin',[id,message.id,true]);expect((await actor(ids.client,()=>query('select * from care_chat_pins($1)',[id])))).toHaveLength(1);
 await rpc('client','chat_block',[ids.doctor]);await expect(rpc('doctor','care_plan_list',[id])).rejects.toThrow(/chat_blocked/);
 await rpc('client','chat_unblock',[ids.doctor]);
 await rpc('owner','chat_set_user_role',[ids.doctor,'user']);expect((await rpc('doctor','care_plan_list',[id])).can_author).toBe(false);
 await expect(rpc('doctor','care_plan_save',[id,'خطة تانية',JSON.stringify([{name:'فطار',items:'بيض'}]),'','','10000000-0000-4000-8000-000000000003',1])).rejects.toThrow(/chat_read_only/);
 expect((await rpc('client','care_plan_list',[id])).versions).toHaveLength(1);
 await db.query('delete from auth.users where id=$1',[ids.client]);
 for(const table of ['care_plan_versions','care_plan_choices','care_training_versions','care_appointments','chat_personal_pins'])expect((await query('select count(*)::int n from '+table))[0].n).toBe(0);
});

it('allows only author edits, detects conflicts and preserves reported snapshots',async()=>{
 await consentAll();
 for(const m of ['0033_care_plans.sql','0034_chat_search_pins.sql','0037_chat_message_edits.sql'])await db.exec(readFileSync('supabase/migrations/'+m,'utf8'));
 const id=await conversation();
 const original=await rpc('doctor','chat_send',[id,'Original coaching advice','20000000-0000-4000-8000-000000000001']);
 const edit=(who,text,revision=0)=>actor(ids[who],()=>query('select * from public.chat_edit_message($1,$2,$3,$4)',[id,original.id,text,revision]));
 await expect(edit('client','forged')).rejects.toThrow(/message_not_allowed/);
 await expect(edit('owner','forged')).rejects.toThrow(/chat_not_allowed/);
 await expect(edit('stranger','forged')).rejects.toThrow(/chat_not_allowed/);
 await rpc('client','moderation_report',['chat_message','abuse',null,id,original.id,null,'Test report']);
 const revised=(await edit('doctor',' Corrected coaching advice '))[0];
 expect(revised.body).toBe('Corrected coaching advice');expect(revised.revision).toBe(1);expect(revised.edited_at).toBeTruthy();expect(revised.seq).toBe(original.seq);expect(new Date(revised.created_at).toISOString()).toBe(new Date(original.created_at).toISOString());
 expect((await query('select content_snapshot from public.moderation_reports'))[0].content_snapshot).toBe('Original coaching advice');
 await expect(edit('doctor','stale text')).rejects.toThrow(/message_edit_conflict/);
 for(const value of [' ','x'.repeat(2001),null])await expect(edit('doctor',value,1)).rejects.toThrow(/invalid_message/);
 expect((await edit('doctor','Corrected coaching advice',1))[0].revision).toBe(1);
 await rpc('client','care_chat_pin',[id,original.id,true]);
 expect((await actor(ids.client,()=>query('select body,edited_at from public.care_chat_pins($1)',[id])))[0].body).toBe('Corrected coaching advice');
 expect(await actor(ids.client,()=>query('select * from public.care_chat_search($1,$2)',[id,'Original']))).toHaveLength(0);
 await rpc('client','chat_block',[ids.doctor]);await expect(edit('doctor','blocked edit',1)).rejects.toThrow(/chat_blocked/);
 await rpc('client','chat_unblock',[ids.doctor]);
 await rpc('owner','chat_set_user_role',[ids.doctor,'user']);await expect(edit('doctor','revoked edit',1)).rejects.toThrow(/chat_read_only/);
 await expect(actor(ids.doctor,()=>query("update public.chat_messages set body='direct write'"))).rejects.toThrow(/permission denied/);
 await expect(actor(null,()=>query('select * from public.chat_edit_message($1,$2,$3,$4)',[id,original.id,'anonymous',1]),'anon')).rejects.toThrow(/permission denied/);
});
