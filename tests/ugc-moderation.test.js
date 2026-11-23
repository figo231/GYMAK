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
 await db.exec(moderation);installed=true;
});
describe("UGC terms, report and block SQL against an actual embedded PostgreSQL engine",()=>{
 it("keeps every pre-existing function, constraint and policy definition unchanged",async()=>{
  // Capture the baseline independently, since beforeEach already applied v2.
  const old=new PGlite();try{await old.exec("create role authenticated;create role anon;create role service_role bypassrls;drop schema public cascade;"+baseline+chat);
   const q="select p.proname,pg_get_function_identity_arguments(p.oid) args,pg_get_functiondef(p.oid) definition from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' order by 1,2";
   for(const f of (await old.query(q)).rows){const now=(await db.query("select pg_get_functiondef(p.oid) definition from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname=$1 and pg_get_function_identity_arguments(p.oid)=$2",[f.proname,f.args])).rows;expect(now[0]?.definition).toBe(f.definition);}
   expect((await query("select pg_get_constraintdef(oid) def from pg_constraint where conrelid='chat_consents'::regclass and contype='c'"))[0].def).toContain('2026-11-22-v1');
   const policies="select tablename,policyname,qual,with_check from pg_policies where schemaname='public' order by 1,2";
   for(const p of(await old.query(policies)).rows)expect((await db.query("select tablename,policyname,qual,with_check from pg_policies where schemaname='public' and tablename=$1 and policyname=$2",[p.tablename,p.policyname])).rows[0]).toEqual(p);
  }finally{await old.close();}
 });
 it("enforces blocks and new consent through legacy send RPCs without deleting history",async()=>{
  await expect(actor(ids.client,()=>query("select public.chat_start($1,'doctor')",[ids.doctor]))).rejects.toThrow(/consent_required/);
  await consentAll();const id=await conversation();
  await actor(ids.client,()=>query("select public.chat_send($1,'legacy-safe',gen_random_uuid())",[id]));
  await rpc('client','chat_block',[ids.doctor]);
  await expect(actor(ids.doctor,()=>query("select public.chat_send($1,'bypass',gen_random_uuid())",[id]))).rejects.toThrow(/chat_blocked/);
  expect((await actor(ids.client,()=>query('select body from chat_messages where conversation_id=$1',[id])))[0].body).toBe('legacy-safe');
 });

 it("reapplies without losing reports, blocks or consents",async()=>{
  await consentAll(); const id=await conversation();
  await rpc("client","chat_block",[ids.doctor]);
  const rid=await rpc("client","moderation_report",["chat_user","abuse",ids.doctor,null,null,null,"details"]);
  await expect(db.exec(moderation)).rejects.toThrow(); await db.exec("rollback");
  expect((await rpc("client","chat_blocks_mine")).length).toBe(1);
  const list=await rpc("owner","moderation_reports_list",["all",null,null]);
  expect(list[0].id).toBe(rid); expect(list[0].details).toBe("details");
  expect((await rpc("client","chat_inbox"))[0].id).toBe(id);
 });
 it("requires the ToU-bearing consent version and records both consents",async()=>{
  expect((await rpc("client","chat_bootstrap")).consent).toBe(false);
  await expect(conversation()).rejects.toThrow(/consent_required/);
  expect((await rpc("client","terms_status")).accepted).toBe(false);
  await rpc("client","chat_accept_terms",[V2]);
  expect((await rpc("client","chat_bootstrap")).consent).toBe(true);
  expect((await rpc("client","terms_status"))).toMatchObject({accepted:true,version:V2});
  expect((await query("select count(*)::int n from public.terms_acceptances where user_id=$1",[ids.client]))[0].n).toBe(1);
  await rpc("doctor","chat_accept_terms",[V2]);
  expect(await conversation()).toBeTruthy();
 });
 it("rejects wrong or unauthenticated terms acceptance",async()=>{
  await expect(rpc("client","terms_accept",["wrong"])).rejects.toThrow(/terms_version_mismatch/);
  await expect(rpc("client","chat_accept_terms",[V1])).rejects.toThrow(/terms_version_mismatch/);
  await expect(actor(null,()=>query("select public.terms_status()"))).rejects.toThrow(/not_authenticated/);
 });
 it("enforces blocks on send and start in both directions, keeping history",async()=>{
  await consentAll(); const id=await conversation();
  await rpc("doctor","chat_send",[id,"before block","20000000-0000-0000-0000-000000000001"]);
  await rpc("client","chat_block",[ids.doctor]);
  await expect(rpc("doctor","chat_send",[id,"after","20000000-0000-0000-0000-000000000002"])).rejects.toThrow(/chat_blocked/);
  await expect(rpc("client","chat_send",[id,"after","20000000-0000-0000-0000-000000000003"])).rejects.toThrow(/chat_blocked/);
  await expect(conversation()).rejects.toThrow(/chat_blocked/);
  const inbox=await rpc("client","chat_inbox");
  expect(inbox[0].blocked).toBe(true); expect(inbox[0].writable).toBe(false);
  expect((await actor(ids.client,()=>query("select body from public.chat_messages")))[0].body).toBe("before block");
  await rpc("client","chat_unblock",[ids.doctor]);
  expect((await rpc("client","chat_inbox"))[0].writable).toBe(true);
  await rpc("doctor","chat_send",[id,"works again","20000000-0000-0000-0000-000000000004"]);
 });
 it("blocks the professional direction too and validates targets",async()=>{
  await consentAll(); await conversation();
  await rpc("doctor","chat_block",[ids.client]);
  await expect(rpc("client","chat_send",[(await rpc("client","chat_inbox"))[0].id,"x","20000000-0000-0000-0000-000000000005"])).rejects.toThrow(/chat_blocked/);
  await expect(rpc("client","chat_block",[ids.client])).rejects.toThrow(/invalid_block/);
  await expect(rpc("client","chat_block",["99999999-0000-0000-0000-000000000000"])).rejects.toThrow(/account_not_found/);
  await expect(rpc("missing","chat_block",[ids.doctor])).rejects.toThrow(/consent_required/);
 });
 it("keeps block rows visible to participants only and denies direct writes",async()=>{
  await consentAll(); await rpc("client","chat_block",[ids.doctor]);
  expect((await actor(ids.client,()=>query("select * from public.chat_blocks"))).length).toBe(1);
  expect((await actor(ids.doctor,()=>query("select * from public.chat_blocks"))).length).toBe(1);
  expect((await actor(ids.stranger,()=>query("select * from public.chat_blocks"))).length).toBe(0);
  await expect(actor(ids.client,()=>query("insert into public.chat_blocks values($1,$2)",[ids.client,ids.coach]))).rejects.toThrow(/permission denied/);
  expect((await rpc("client","chat_blocks_mine"))[0].blocked_id).toBe(ids.doctor);
 });
 it("reports a peer message with an exact snapshot for the owner only",async()=>{
  await consentAll(); const id=await conversation();
  const m=await rpc("doctor","chat_send",[id,"reported body","20000000-0000-0000-0000-000000000006"]);
  const rid=await rpc("client","moderation_report",["chat_message","abuse",null,id,m.id,null,"he was rude"]);
  const own=await actor(ids.client,()=>query("select * from public.moderation_reports"));
  expect(own[0].content_snapshot).toBe("reported body"); expect(own[0].target_user_id).toBe(ids.doctor);
  expect((await actor(ids.owner,()=>query("select id from public.moderation_reports"))).length).toBe(1);
  expect((await actor(ids.stranger,()=>query("select id from public.moderation_reports"))).length).toBe(0);
  await expect(actor(ids.client,()=>query("insert into public.moderation_reports(reporter_id,target_type,reason) values($1,'chat_user','abuse')",[ids.client]))).rejects.toThrow(/permission denied/);
  const list=await rpc("owner","moderation_reports_list",["open",null,null]);
  expect(list[0].id).toBe(rid); expect(list[0].reporter_label).toBe("client"); expect(list[0].target_label).toBe("doctor");
 });
 it("rejects reporting own messages, strangers and duplicates",async()=>{
  await consentAll(); const id=await conversation();
  const mine=await rpc("client","chat_send",[id,"my own","20000000-0000-0000-0000-000000000007"]);
  await expect(rpc("client","moderation_report",["chat_message","abuse",null,id,mine.id,null,null])).rejects.toThrow(/report_self/);
  await expect(rpc("stranger","moderation_report",["chat_message","abuse",null,id,mine.id,null,null])).rejects.toThrow(/report_not_allowed/);
  await expect(rpc("client","moderation_report",["chat_message","nonsense",null,id,mine.id,null,null])).rejects.toThrow(/invalid_reason/);
  await rpc("client","moderation_report",["chat_user","scam",ids.doctor,null,null,null,null]);
  await expect(rpc("client","moderation_report",["chat_user","scam",ids.doctor,null,null,null,null])).rejects.toThrow(/report_duplicate/);
 });
 it("requires a shared conversation before reporting a user",async()=>{
  await consentAll();
  await expect(rpc("client","moderation_report",["chat_user","abuse",ids.doctor,null,null,null,null])).rejects.toThrow(/report_not_allowed/);
  await conversation();
  expect(await rpc("client","moderation_report",["chat_user","abuse",ids.doctor,null,null,null,null])).toBeTruthy();
  await expect(rpc("client","moderation_report",["chat_user","abuse",ids.client,null,null,null,null])).rejects.toThrow(/report_self/);
 });
 it("reports support replies only for their owner",async()=>{
  await consentAll();
  const fid=(await query("insert into public.feedback(user_id,message,admin_reply) values($1,'q','reply text') returning id",[ids.client]))[0].id;
  await expect(rpc("stranger","moderation_report",["support_reply","abuse",null,null,null,fid,null])).rejects.toThrow(/report_not_allowed/);
  await rpc("client","moderation_report",["support_reply","other",null,null,null,fid,"bad reply"]);
  const list=await rpc("owner","moderation_reports_list",["open",null,null]);
  expect(list[0].target_type).toBe("support_reply"); expect(list[0].content_snapshot).toBe("reply text");
 });
 it("limits reports to ten per hour per reporter",async()=>{
  await consentAll(); const id=await conversation();
  for(let i=0;i<10;i++){const m=await rpc("doctor","chat_send",[id,"m"+i,`20000000-0000-0000-0001-${String(i).padStart(12,"0")}`]);await rpc("client","moderation_report",["chat_message","abuse",null,id,m.id,null,null]);}
  const extra=await rpc("doctor","chat_send",[id,"extra","20000000-0000-0000-0000-000000000008"]);
  await expect(rpc("client","moderation_report",["chat_message","abuse",null,id,extra.id,null,null])).rejects.toThrow(/report_rate_limited/);
 });
 it("keeps the moderation queue owner-only with status transitions",async()=>{
  await consentAll(); const id=await conversation();
  await rpc("client","moderation_report",["chat_user","abuse",ids.doctor,null,null,null,null]);
  const rid=(await rpc("owner","moderation_reports_list",["open",null,null]))[0].id;
  for(const name of ["client","sender","doctor"])await expect(rpc(name,"moderation_reports_list",["all",null,null])).rejects.toThrow(/owner_only/);
  await expect(rpc("client","moderation_report_update",[rid,"reviewed"])).rejects.toThrow(/owner_only/);
  await expect(rpc("owner","moderation_report_update",[rid,"nonsense"])).rejects.toThrow(/invalid_status/);
  await rpc("owner","moderation_report_update",[rid,"reviewed"]);
  expect((await rpc("owner","moderation_reports_list",["open",null,null])).length).toBe(0);
  expect((await rpc("owner","moderation_reports_list",["reviewed",null,null]))[0].status).toBe("reviewed");
  await rpc("owner","moderation_report_update",[rid,"actioned"]);
  expect((await query("select status, reviewed_by from public.moderation_reports"))[0]).toMatchObject({status:"actioned",reviewed_by:ids.owner});
 });
 it("cascades reports, blocks and consents on account deletion",async()=>{
  await consentAll(); await conversation();
  await rpc("client","chat_block",[ids.doctor]);
  await rpc("client","moderation_report",["chat_user","abuse",ids.doctor,null,null,null,null]);
  await db.query("delete from auth.users where id=$1",[ids.client]);
  expect(await query("select id from public.moderation_reports")).toHaveLength(0);
  expect(await query("select * from public.chat_blocks")).toHaveLength(0);
  expect(await query("select * from public.terms_acceptances where user_id=$1",[ids.client])).toHaveLength(0);
 });
 it("hides the new tables and RPCs from anonymous callers and keeps helpers internal",async()=>{
  await expect(actor(null,()=>query("select * from public.moderation_reports"),"anon")).rejects.toThrow(/permission denied/);
  await expect(actor(null,()=>query("select * from public.chat_blocks"),"anon")).rejects.toThrow(/permission denied/);
  await expect(actor(null,()=>query("select * from public.terms_acceptances"),"anon")).rejects.toThrow(/permission denied/);
  await expect(actor(null,()=>query("select public.moderation_reports_list()"),"anon")).rejects.toThrow(/permission denied/);
  await expect(actor(ids.client,()=>query(`select public.chat_blocked_between('${ids.client}','${ids.doctor}')`))).rejects.toThrow(/permission denied/);
 });
});
