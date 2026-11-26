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
beforeAll(async()=>{installed=false;
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
 await db.exec(readFileSync('supabase/migrations/0025_suggested_professionals.sql','utf8'));await db.exec(moderation);await db.exec('update apk18_rollout_control set chat_writes=true');installed=true;
 await db.exec(readFileSync('supabase/migrations/0038_chat_identity_requests.sql','utf8'));
 await db.exec(readFileSync('supabase/migrations/0039_chat_profiles_receipts.sql','utf8'));
 await db.exec(readFileSync('supabase/migrations/0041_chat_discovery.sql','utf8'));
 await db.exec(`create schema storage;create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);create table storage.objects(id uuid primary key default gen_random_uuid(),bucket_id text,name text,metadata jsonb);alter table storage.objects enable row level security;grant usage on schema storage to authenticated;grant select,insert,update,delete on storage.objects to authenticated;`);
 await db.exec(readFileSync('supabase/migrations/0040_chat_avatar_storage.sql','utf8'));
 await db.exec(readFileSync('supabase/migrations/0042_chat_photo_delivery.sql','utf8'));
 await db.exec(readFileSync('supabase/migrations/0043_chat_photo_reports.sql','utf8'));
 await db.exec(readFileSync('supabase/migrations/0044_chat_directory_badges.sql','utf8'));await db.exec(readFileSync('supabase/migrations/0045_chat_live_identity.sql','utf8'));
 await db.exec(readFileSync('supabase/migrations/0047_chat_photo_free_guard.sql','utf8'));
 await db.exec(readFileSync('supabase/migrations/0053_chat_username_search.sql','utf8'));

 await consentAll();
});

describe('APK25 owner identities and role requests',()=>{
 it('only the owner can verify, ordinary users cannot enumerate badges',async()=>{await expect(rpc('client','chat_set_verified',[ids.doctor,true])).rejects.toThrow(/owner_only/);await expect(rpc('sender','chat_set_verified',[ids.doctor,true])).rejects.toThrow(/owner_only/);await rpc('owner','chat_set_verified',[ids.doctor,true]);expect(await rpc('owner','chat_owner_badges')).toContain(ids.doctor);await expect(rpc('client','chat_owner_badges')).rejects.toThrow(/owner_only/);});
 it('pins developer contact first without exposing emails',async()=>{const rows=await actor(ids.client,()=>query('select * from chat_contacts_v3()'));expect(rows[0].kind).toBe('support');expect(rows[0].user_id).toBe(ids.owner);expect(rows[0].verified).toBe(true);expect(rows[0]).not.toHaveProperty('email');});
 it('uses existing send, block and RLS for support; owner gains no access to others',async()=>{const id=await rpc('client','chat_start',[ids.owner,'support']);await rpc('client','chat_send',[id,'Support test',crypto.randomUUID()]);expect((await actor(ids.owner,()=>query('select * from chat_inbox_v3()')))[0].preview).toBe('Support test');await rpc('client','chat_block',[ids.owner]);await expect(rpc('client','chat_send',[id,'blocked',crypto.randomUUID()])).rejects.toThrow(/chat_blocked/);await rpc('client','chat_unblock',[ids.owner]);const other=await conversation();await rpc('doctor','chat_send',[other,'private doctor message',crypto.randomUUID()]);expect(await actor(ids.owner,()=>query('select * from chat_messages where conversation_id=$1',[other]))).toHaveLength(0);});
 it('member role request remains pending without role/badge or doctor consent',async()=>{const id=await rpc('stranger','chat_role_request_submit',['doctor','I want to offer nutrition support']);await expect(rpc('stranger','chat_role_request_submit',['coach','Another role request'])).rejects.toThrow(/request_pending/);expect((await rpc('stranger','chat_bootstrap')).role).toBe('user');await expect(rpc('stranger','chat_role_request_decide',[id,true,true])).rejects.toThrow(/owner_only/);await db.query('delete from terms_acceptances where user_id=$1',[ids.stranger]);await rpc('owner','chat_role_request_decide',[id,true,true]);expect((await rpc('stranger','chat_role_requests_list'))[0].status).toBe('approved');expect((await rpc('owner','chat_owner_badges'))).toContain(ids.stranger);expect((await actor(ids.client,()=>query('select * from chat_contacts_v3()'))).some(x=>x.user_id===ids.stranger)).toBe(false);await expect(rpc('owner','chat_role_request_decide',[id,true,true])).rejects.toThrow(/request_closed/);});
 it('previews are participant scoped and literal name search excludes unrelated threads',async()=>{expect(await actor(ids.sender,()=>query('select * from chat_inbox_v3()'))).toHaveLength(0);expect(await actor(ids.client,()=>query("select * from chat_inbox_v3(p_search=>'%')"))).toHaveLength(0);await expect(actor(ids.client,()=>query('select * from chat_verifications'))).rejects.toThrow(/permission denied/);await expect(actor(ids.client,()=>query('select * from chat_role_requests'))).rejects.toThrow(/permission denied/);});
});

describe('APK25 profile privacy and real acknowledgements',()=>{
 it('keeps hidden unrelated profiles private, own editing and names bounded',async()=>{await expect(rpc('client','chat_profile_get',[ids.phone])).rejects.toThrow(/profile_unavailable/);await expect(rpc('client','chat_profile_save',['A','bio',ids.doctor+'/chat-avatar.jpg',true,true])).rejects.toThrow(/invalid_avatar/);await rpc('client','chat_profile_save',['Client','Private bio',ids.client+'/chat-avatar.jpg',false,true]);expect((await rpc('client','chat_profile_get',[ids.client])).bio).toBe('Private bio');expect((await rpc('doctor','chat_profile_get',[ids.client])).bio).toBe('');await expect(actor(ids.client,()=>query('select * from chat_profiles'))).rejects.toThrow(/permission denied/);});
 it('exposes only opted in profile fields without workout/email data',async()=>{await rpc('client','chat_profile_save',['Chat name','Shared bio',null,true,true]);const p=await rpc('sender','chat_profile_get',[ids.client]);expect(p.bio).toBe('Shared bio');expect(p.display_name).toBe('Chat name');expect(p).not.toHaveProperty('email');expect(p).not.toHaveProperty('read_receipts');});
 it('only participants acknowledge bounded messages; read opt out is mutual',async()=>{const id=await conversation();const m=await rpc('doctor','chat_send',[id,'Receipt test',crypto.randomUUID()]);await expect(rpc('sender','chat_ack',[id,m.seq,true])).rejects.toThrow(/chat_not_allowed/);expect((await rpc('doctor','chat_receipt_status',[id])).delivered_seq).toBe(0);await rpc('client','chat_ack',[id,m.seq,false]);let r=await rpc('doctor','chat_receipt_status',[id]);expect(Number(r.delivered_seq)).toBe(Number(m.seq));expect(Number(r.read_seq)).toBe(0);await rpc('client','chat_ack',[id,m.seq,true]);expect(Number((await rpc('doctor','chat_receipt_status',[id])).read_seq)).toBe(Number(m.seq));await rpc('client','chat_profile_save',['Chat name','',null,true,false]);r=await rpc('doctor','chat_receipt_status',[id]);expect(r.read_seq).toBe(0);expect(r.reads_enabled).toBe(false);await rpc('client','chat_ack',[id,999999999999,false]);expect(Number((await rpc('doctor','chat_receipt_status',[id])).delivered_seq)).toBe(Number(m.seq));});
});

describe('APK25 opted in username discovery',()=>{
 it('does not expose existing usernames until enabled and uses exact case-insensitive lookup',async()=>{expect(await rpc('client','chat_username_lookup',['u_phone'])).toBeNull();await rpc('phone','chat_accept_terms',[V2]);await rpc('phone','chat_discovery_save',[true]);expect(await rpc('client','chat_username_lookup',['u_ph%'])).toBeNull();expect((await rpc('client','chat_username_lookup',['U_PHONE'])).user_id).toBe(ids.phone);await expect(rpc('client','chat_username_start',[ids.sender])).rejects.toThrow(/chat_not_allowed/);});
 it('creates only one pair thread, blocks discovery and sends, disables new starts independently',async()=>{const id=await rpc('client','chat_username_start',[ids.phone]);const reverse=await rpc('phone','chat_username_start',[ids.client]).catch(()=>null);expect(reverse).toBeNull();const m=await rpc('client','chat_send',[id,'Hello by username',crypto.randomUUID()]);expect(m.body).toBe('Hello by username');await rpc('phone','chat_discovery_save',[false]);expect(await rpc('sender','chat_username_lookup',['u_phone'])).toBeNull();await expect(rpc('sender','chat_username_start',[ids.phone])).rejects.toThrow(/chat_not_allowed/);await rpc('client','chat_block',[ids.phone]);await expect(rpc('phone','chat_send',[id,'blocked',crypto.randomUUID()])).rejects.toThrow(/chat_blocked/);await rpc('phone','chat_discovery_save',[true]);expect(await rpc('client','chat_username_lookup',['u_phone'])).toBeNull();await rpc('client','chat_unblock',[ids.phone]);});
 it('rate limits username probes',async()=>{for(let i=0;i<15;i++)await rpc('sender','chat_username_lookup',['missing-name']);expect((await rpc('sender','chat_username_lookup',['u_phone'])).limited).toBe(true);});
});

describe('APK25 private temporary photo delivery',()=>{
 it('restricts reservations and storage; publishes only after upload and preserves retry nonce',async()=>{const id=await conversation();await expect(rpc('sender','chat_photo_reserve',[id,crypto.randomUUID(),100])).rejects.toThrow(/chat_not_allowed/);await expect(rpc('client','chat_photo_reserve',[id,crypto.randomUUID(),204801])).rejects.toThrow(/invalid_photo/);const nonce=crypto.randomUUID();const r=await rpc('doctor','chat_photo_reserve',[id,nonce,100]);expect((await rpc('doctor','chat_photo_reserve',[id,nonce,100])).id).toBe(r.id);await expect(rpc('doctor','chat_photo_publish',[r.id])).rejects.toThrow(/photo_unavailable/);await db.query("insert into storage.objects(bucket_id,name) values('chat-delivery',$1)",[r.path]);expect(await actor(ids.owner,()=>query("select * from storage.objects where bucket_id='chat-delivery'"))).toHaveLength(0);const m=await rpc('doctor','chat_photo_publish',[r.id]);expect(m.photo_id).toBe(r.id);expect((await rpc('doctor','chat_photo_publish',[r.id])).id).toBe(m.id);await expect(rpc('sender','chat_photo_access',[r.id])).rejects.toThrow(/photo_not_allowed/);await expect(rpc('client','chat_photo_removed',[r.id,true])).rejects.toThrow(/permission denied/);expect((await rpc('client','chat_photo_access',[r.id])).status).toBe('ready');const report=await rpc('client','chat_photo_report',[r.id,'abuse','Unwanted image',false]);expect((await rpc('owner','chat_report_photo_access',[report])).path).toBeNull();await expect(rpc('sender','chat_report_photo_access',[report])).rejects.toThrow(/report_not_allowed/);await db.query("update chat_photos set status='saved' where id=$1",[r.id]);expect((await rpc('client','chat_photo_access',[r.id])).status).toBe('saved');});
 it('avatar storage is private, opt in and blocked viewers cannot read',async()=>{await actor(ids.client,()=>query("insert into storage.objects(bucket_id,name) values('chat-avatars',$1)",[ids.client+'/chat-avatar.jpg']));await rpc('client','chat_profile_save',['Client','',ids.client+'/chat-avatar.jpg',false,true]);expect(await actor(ids.sender,()=>query("select * from storage.objects where bucket_id='chat-avatars'"))).toHaveLength(0);await rpc('client','chat_profile_save',['Client','',ids.client+'/chat-avatar.jpg',true,true]);expect(await actor(ids.sender,()=>query("select * from storage.objects where bucket_id='chat-avatars'"))).toHaveLength(1);await rpc('client','chat_block',[ids.sender]);expect(await actor(ids.sender,()=>query("select * from storage.objects where bucket_id='chat-avatars'"))).toHaveLength(0);await rpc('client','chat_unblock',[ids.sender]);});
});

describe('APK25 current chat identity',()=>{
 it('updates existing list/header identity without rewriting old messages',async()=>{const id=await conversation();await rpc('doctor','chat_profile_save',['New doctor name','New bio',null,true,true]);let r=await actor(ids.client,()=>query('select * from chat_inbox_v3(p_only=>$1)',[id]));expect(r[0].peer_label).toBe('New doctor name');expect((await actor(ids.client,()=>query("select * from chat_inbox_v3(p_search=>'New doctor name')"))).some(x=>x.id===id)).toBe(true);await rpc('doctor','chat_profile_save',['Latest doctor name','',null,true,true]);r=await actor(ids.client,()=>query('select * from chat_inbox_v3(p_only=>$1)',[id]));expect(r[0].peer_label).toBe('Latest doctor name');expect((await query('select receipt_updated_at from chat_conversations where id=$1',[id]))[0].receipt_updated_at).not.toBeNull();expect((await query('select body from chat_messages where conversation_id=$1 order by seq limit 1',[id]))[0].body).toBe('private doctor message');});
});

describe('APK25 professional directory badge wrapper',()=>{
 it('preserves publication, filtering and consent independently of badges',async()=>{await rpc('owner','professional_card_save',[ids.doctor,'Listed doctor','Nutrition',true]);await rpc('owner','professional_card_save',[ids.coach,'Hidden coach','Training',false]);await rpc('owner','chat_set_verified',[ids.doctor,true]);let rows=await rpc('client','professional_directory_v2',['all',null]);expect(rows.map(x=>x.user_id)).toEqual([ids.doctor]);expect(rows[0].verified).toBe(true);expect(rows[0]).not.toHaveProperty('email');expect(await rpc('client','professional_directory_v2',['coach',null])).toEqual([]);expect(await rpc('client','professional_directory_v2',['all',ids.doctor])).toEqual([]);await rpc('owner','chat_set_verified',[ids.doctor,false]);rows=await rpc('client','professional_directory_v2',['doctor',null]);expect(rows[0].verified).toBe(false);await expect(rpc('client','professional_directory_v2',['invalid',null])).rejects.toThrow(/invalid_filter/);});
});

describe('APK25 global free-only storage guard',()=>{
 it('counts all buckets and fails closed on unknown size without a bucket cap',async()=>{
  await db.query("insert into storage.buckets(id,name,public) values('unrelated','unrelated',false)");
  await db.query("insert into storage.objects(bucket_id,name,metadata) values('unrelated','unknown','{}')");
  const id=await conversation();await expect(rpc('client','chat_photo_reserve',[id,crypto.randomUUID(),100])).rejects.toThrow(/photo_storage_full/);
  await expect(actor(ids.client,()=>query("insert into storage.objects(bucket_id,name) values('chat-avatars',$1)",[ids.client+'/chat-avatar.jpg']))).rejects.toThrow(/photo_storage_full/);
  await db.query("delete from storage.objects where bucket_id='unrelated'");
  await expect(rpc('client','chat_photo_reserve',[id,crypto.randomUUID(),100])).resolves.toHaveProperty('id');
 });
});

describe('APK25 photo budget boundaries',()=>{
 it('blocks before 400 MiB even when the usage comes from another bucket',async()=>{
  await db.query("insert into storage.objects(bucket_id,name,metadata) values('unrelated','large',$1)",[JSON.stringify({size:419430400-50})]);
  const id=await conversation();await expect(rpc('client','chat_photo_reserve',[id,crypto.randomUUID(),100])).rejects.toThrow(/photo_storage_full/);
  await db.query("delete from storage.objects where bucket_id='unrelated'");
 });
 it('counts expired but not physically deleted objects toward the global budget',async()=>{
  await db.query("insert into storage.objects(bucket_id,name,metadata) values('unrelated','leftover',$1)",[JSON.stringify({size:419430400})]);
  await expect(query('select chat_storage_budget_check(1)')).rejects.toThrow(/photo_storage_full/);
  await db.query("delete from storage.objects where bucket_id='unrelated'");
 });
});

it('finds an existing conversation by username even when its visible name differs',async()=>{const id=await conversation('doctor');await rpc('doctor','chat_profile_save',['Doctor Display','',null,true,true]);const rows=await actor(ids.client,()=>query("select * from chat_inbox_v3(null,null,null,$1)",['@U_DOCTOR']));expect(rows.some(r=>r.id===id)).toBe(true);const partial=await actor(ids.client,()=>query("select * from chat_inbox_v3(null,null,null,$1)",['u_doct']));expect(partial.some(r=>r.id===id)).toBe(true);});

it('reproduces production missing username match then fixes it with53 without changing privacy',async()=>{const id=await conversation('doctor');await rpc('doctor','chat_profile_save',['Doctor Display','',null,true,true]);await db.exec(readFileSync('supabase/migrations/0045_chat_live_identity.sql','utf8').split('create function public.chat_identity_broadcast')[0]+'commit;');expect((await actor(ids.client,()=>query("select * from chat_inbox_v3(p_search=>$1)",['@u_doctor']))).some(r=>r.id===id)).toBe(false);await db.exec(readFileSync('supabase/migrations/0053_chat_username_search.sql','utf8'));expect((await actor(ids.client,()=>query("select * from chat_inbox_v3(p_search=>$1)",['@u_doctor']))).some(r=>r.id===id)).toBe(true);await rpc('stranger','chat_accept_terms',[V2]);expect(await actor(ids.stranger,()=>query("select * from chat_inbox_v3(p_search=>$1)",['@u_doctor']))).toHaveLength(0);});


describe('Automatic verified professional suggestions',()=>{
 beforeAll(async()=>{await db.exec(readFileSync('supabase/migrations/0059_verified_professional_directory.sql','utf8'));});
 it('lists verified roles without manual cards and respects profile privacy',async()=>{
  await rpc('owner','chat_set_verified',[ids.doctor,true]);
  await rpc('doctor','chat_profile_save',['Doctor display','Hidden bio',null,false,true]);
  await db.query('delete from professional_cards where user_id=$1',[ids.doctor]);
  let rows=await rpc('client','professional_directory_v2',['doctor',null]);
  expect(rows.find(x=>x.user_id===ids.doctor)).toMatchObject({verified:true,name:'doctor',bio:'',kind:'doctor'});
  await rpc('doctor','chat_profile_save',['Doctor display','Visible bio',null,true,true]);
  rows=await rpc('client','professional_directory_v2',['doctor',null]);
  expect(rows.find(x=>x.user_id===ids.doctor)).toMatchObject({name:'Doctor display',bio:'Visible bio'});
  expect(JSON.stringify(rows)).not.toContain('@test.invalid');
 });
 it('unverify removes and reverify restores, removed role never remains',async()=>{
  await rpc('owner','chat_set_verified',[ids.doctor,false]);
  expect((await rpc('client','professional_directory_v2',['all',null])).some(x=>x.user_id===ids.doctor)).toBe(false);
  await rpc('owner','chat_set_verified',[ids.doctor,true]);
  expect((await rpc('client','professional_directory_v2',['doctor',null])).some(x=>x.user_id===ids.doctor)).toBe(true);
  await rpc('owner','chat_set_user_role',[ids.doctor,'user']);
  expect((await rpc('client','professional_directory_v2',['all',null])).some(x=>x.user_id===ids.doctor)).toBe(false);
  await rpc('owner','chat_set_user_role',[ids.doctor,'doctor']);
 });
 it('accepts a consented request without card while retaining private contact controls',async()=>{
  await db.query('delete from professional_requests where professional_id=$1 and client_id=$2',[ids.doctor,ids.sender]);
  const id=await rpc('sender','professional_request_send',[ids.doctor,'doctor']);expect(id).toBeTruthy();
  await rpc('sender','chat_block',[ids.doctor]);
  expect((await rpc('sender','professional_directory_v2',['doctor',null])).some(x=>x.user_id===ids.doctor)).toBe(false);
  await expect(rpc('sender','professional_request_send',[ids.doctor,'doctor'])).rejects.toThrow(/request_not_allowed/);
  await rpc('sender','chat_unblock',[ids.doctor]);
 });
});


describe('Professional audience restrictions',()=>{
 it('defaults all and enforces male/female and unset viewers server-side',async()=>{
  expect(await rpc('owner','professional_audience_owner',[ids.doctor])).toBe('all');
  await expect(rpc('client','professional_audience_save',[ids.doctor,'female'])).rejects.toThrow(/owner_only/);
  await rpc('owner','professional_audience_save',[ids.doctor,'female']);
  await db.query("update profiles set gender=null where id=$1",[ids.client]);
  expect((await rpc('client','professional_directory_v2',['doctor',null])).some(x=>x.user_id===ids.doctor)).toBe(false);
  await expect(rpc('client','professional_request_send',[ids.doctor,'doctor'])).rejects.toThrow(/request_not_allowed/);
  await db.query("update profiles set gender='male' where id=$1",[ids.client]);
  expect((await rpc('client','professional_directory_v2',['doctor',null])).some(x=>x.user_id===ids.doctor)).toBe(false);
  await db.query("update profiles set gender='female' where id=$1",[ids.client]);
  expect((await rpc('client','professional_directory_v2',['doctor',null])).some(x=>x.user_id===ids.doctor)).toBe(true);
  await rpc('owner','professional_audience_save',[ids.doctor,'all']);
 });
});
describe('Default avatar preserves explicit choices',()=>{
 beforeAll(async()=>{await db.exec(readFileSync('supabase/migrations/0060_default_chat_avatar.sql','utf8'));});
 it('imports only unset profiles, never switches a saved hidden choice',async()=>{
  await db.query('delete from chat_profiles where user_id=$1',[ids.coach]);
  expect((await rpc('coach','chat_profile_get',[ids.coach])).visible).toBe(true);
  expect(await rpc('coach','chat_default_avatar',[ids.coach+'/chat-avatar.jpg'])).toBe(true);
  expect((await rpc('coach','chat_profile_get',[ids.coach])).avatar_path).toBe(ids.coach+'/chat-avatar.jpg');
  await rpc('coach','chat_profile_save',['Coach','',ids.coach+'/chat-avatar.jpg',false,true]);
  expect(await rpc('coach','chat_default_avatar',[ids.coach+'/chat-avatar.jpg'])).toBe(false);
  expect((await rpc('coach','chat_profile_get',[ids.coach])).visible).toBe(false);
  await rpc('coach','chat_profile_save',['Coach','Kept bio',null,true,true]);
  expect(await rpc('coach','chat_default_avatar',[ids.coach+'/chat-avatar.jpg'])).toBe(true);
  expect((await rpc('coach','chat_profile_get',[ids.coach])).bio).toBe('Kept bio');
  await expect(rpc('client','chat_default_avatar',[ids.coach+'/chat-avatar.jpg'])).rejects.toThrow(/invalid_avatar/);
 });
});


describe('Exact username discovery without opt in',()=>{
 beforeAll(async()=>{await db.exec(readFileSync('supabase/migrations/0061_username_default_discovery.sql','utf8'));await db.exec(readFileSync('supabase/migrations/0062_owner_usernames.sql','utf8'));});
 it('finds exact usernames without a chat profile but never partial or blocked accounts',async()=>{
  await db.query('delete from chat_lookup_limits');await db.query('delete from chat_profiles where user_id=$1',[ids.phone]);
  expect((await rpc('client','chat_username_lookup',['@U_PHONE'])).user_id).toBe(ids.phone);
  expect(await rpc('client','chat_username_lookup',['u_ph'])).toBeNull();
  await rpc('client','chat_block',[ids.phone]);expect(await rpc('client','chat_username_lookup',['u_phone'])).toBeNull();await rpc('client','chat_unblock',[ids.phone]);
 });
 it('exposes username and exact timestamp in owner-only users endpoint',async()=>{
  await expect(rpc('client','chat_users',['','all',null,null])).rejects.toThrow(/owner_only/);
  const r=await rpc('owner','chat_users',['','all',null,null]);expect(r.users.find(x=>x.user_id===ids.client)).toMatchObject({username:'u_client',gender:'female'});expect(r.users[0].created_at).toContain('T');
 });
});


describe('Every exact username findable before target chat consent',()=>{
 beforeAll(async()=>{await db.exec(readFileSync('supabase/migrations/0063_exact_username_findable.sql','utf8'));});
 it('finds a target without terms or profile, without changing consent or private fields',async()=>{
  await db.query('delete from chat_lookup_limits');await db.query('delete from terms_acceptances where user_id=$1',[ids.phone]);await db.query('delete from chat_profiles where user_id=$1',[ids.phone]);
  const r=await rpc('client','chat_username_lookup',['@U_PHONE']);expect(r.user_id).toBe(ids.phone);expect(Object.keys(r).sort()).toEqual(['label','user_id','username','verified']);
  expect((await query('select count(*)::int n from terms_acceptances where user_id=$1',[ids.phone]))[0].n).toBe(0);
  expect(await rpc('client','chat_username_lookup',['u_ph'])).toBeNull();
  await rpc('client','chat_block',[ids.phone]);expect(await rpc('client','chat_username_lookup',['u_phone'])).toBeNull();await rpc('client','chat_unblock',[ids.phone]);
 });
 it('still requires caller chat consent and keeps the existing probe limit',async()=>{
  await expect(rpc('phone','chat_username_lookup',['u_client'])).rejects.toThrow(/consent_required/);
  await db.query('delete from chat_lookup_limits');for(let i=0;i<15;i++)await rpc('client','chat_username_lookup',['nonexistent']);expect((await rpc('client','chat_username_lookup',['u_phone'])).limited).toBe(true);
 });
});
