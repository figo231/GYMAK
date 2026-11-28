// Local-only test of the prepared SQL using PGlite (WASM Postgres). Run: npm i --no-save @electric-sql/pglite && node supabase/pending-approval/local-sql-test.mjs
import { PGlite } from "@electric-sql/pglite";
import fs from "node:fs";
const D="/tmp/w/GYMAK-v3/supabase/pending-approval/";
const db=new PGlite();
const out=[];const ok=(n,c,x="")=>{out.push((c?"PASS ":"FAIL ")+n+(x?" "+x:""));};
await db.exec(`
create role anon; create role authenticated; create role service_role;
create schema auth; create table auth.users(id uuid primary key);
create function auth.uid() returns uuid language sql as $$ select null::uuid $$;
create schema storage;
create table storage.buckets(id text primary key, name text, public bool, file_size_limit bigint, allowed_mime_types text[]);
insert into storage.buckets(id,name,public) values('avatars','avatars',true);
create table storage.objects(id uuid, bucket_id text, name text);
create function storage.foldername(n text) returns text[] language sql as $$ select string_to_array(n,'/') $$;
create policy "avatar uploads are per-user folder (update)" on storage.objects for update to authenticated using (bucket_id='avatars');
create table public.admin_rate_limits(admin_id uuid not null references auth.users(id) on delete cascade, window_start timestamptz not null, send_count int not null default 0, primary key(admin_id,window_start));
create table public.weight_logs(id uuid primary key,user_id uuid,date date not null,weight numeric not null,body_fat numeric);
create table public.food_log(id uuid primary key,user_id uuid,date date not null,items jsonb default '[]',total_kcal numeric not null default 0,total_protein numeric not null default 0,total_carbs numeric not null default 0,total_fat numeric not null default 0);
create table public.exercise_logs(id uuid primary key,user_id uuid,exercise_id text,date date not null,weight numeric not null,sets int not null,reps int not null);
create table public.pr_history(id uuid primary key,user_id uuid,exercise_id text,exercise_name text,weight numeric not null,prev_weight numeric not null,date date not null);
`);
const A='11111111-1111-1111-1111-111111111111';
await db.exec(`insert into auth.users values('${A}')`);
// legacy rows that violate the new checks must survive
await db.exec(`insert into public.weight_logs values(gen_random_uuid(),'${A}','2020-01-01',-5,null)`);
// 1 rate limit
await db.exec(fs.readFileSync(D+"0064_rate_limit_atomic.sql","utf8"));
const w="2026-11-28T08:00:00Z";let res=[];
for(let i=0;i<22;i++){const r=await db.query(`select * from public.admin_rate_limit_hit('${A}','${w}',20)`);res.push(r.rows[0]);}
ok("rate limit allows exactly 20",res.filter(r=>r.allowed).length===20,JSON.stringify(res.map(r=>r.allowed).join("").length));
ok("21st and 22nd denied, count stays 20",!res[20].allowed&&!res[21].allowed&&res[21].count===20);
const row=await db.query(`select send_count from public.admin_rate_limits`);ok("stored count is 20 (never over)",row.rows[0].send_count===20);
const w2=await db.query(`select * from public.admin_rate_limit_hit('${A}','2026-11-28T09:00:00Z',20)`);ok("new window starts at 1",w2.rows[0].allowed&&w2.rows[0].count===1);
// concurrency: parallel calls through the same engine
const par=await Promise.all(Array.from({length:30},()=>db.query(`select * from public.admin_rate_limit_hit('${A}','2026-11-28T10:00:00Z',20)`)));
ok("30 parallel calls allow exactly 20",par.filter(r=>r.rows[0].allowed).length===20);
const gr=await db.query(`select has_function_privilege('anon','public.admin_rate_limit_hit(uuid,timestamptz,int)','execute') a, has_function_privilege('authenticated','public.admin_rate_limit_hit(uuid,timestamptz,int)','execute') b, has_function_privilege('service_role','public.admin_rate_limit_hit(uuid,timestamptz,int)','execute') c`);
ok("only service_role can run it",!gr.rows[0].a&&!gr.rows[0].b&&gr.rows[0].c);
// 2 avatars
await db.exec(fs.readFileSync(D+"0065_avatars_limits.sql","utf8"));
const b=await db.query(`select file_size_limit,allowed_mime_types from storage.buckets where id='avatars'`);
ok("avatar bucket limited to 2 MB and 3 image types",Number(b.rows[0].file_size_limit)===2097152&&b.rows[0].allowed_mime_types.length===3);
const p=await db.query(`select with_check is not null w from pg_policies where policyname like 'avatar uploads%update%'`);ok("update policy now has WITH CHECK",p.rows[0].w);
// 3 checks
await db.exec(fs.readFileSync(D+"0066_check_constraints.sql","utf8"));
const bad=async(sql)=>{try{await db.exec(sql);return false}catch(e){return true}};
ok("old bad row survived (NOT VALID)",(await db.query(`select count(*)::int c from public.weight_logs where weight<0`)).rows[0].c===1);
ok("new weight -5 rejected",await bad(`insert into public.weight_logs values(gen_random_uuid(),'${A}','2026-11-28',-5,null)`));
ok("new weight 82.5 accepted",!await bad(`insert into public.weight_logs values(gen_random_uuid(),'${A}','2026-11-28',82.5,18)`));
ok("body fat 150 rejected",await bad(`insert into public.weight_logs values(gen_random_uuid(),'${A}','2026-11-27',80,150)`));
ok("year 1900 rejected",await bad(`insert into public.weight_logs values(gen_random_uuid(),'${A}','1900-01-01',80,null)`));
ok("set with 0 sets rejected",await bad(`insert into public.exercise_logs values(gen_random_uuid(),'${A}','x','2026-11-28',50,0,10)`));
ok("normal set accepted",!await bad(`insert into public.exercise_logs values(gen_random_uuid(),'${A}','x','2026-11-28',50,3,10)`));
ok("timed set 600 reps(sec) accepted",!await bad(`insert into public.exercise_logs values(gen_random_uuid(),'${A}','y','2026-11-28',0,1,600)`));
ok("negative kcal rejected",await bad(`insert into public.food_log values(gen_random_uuid(),'${A}','2026-11-28','[]',-1,0,0,0)`));
ok("normal food day accepted",!await bad(`insert into public.food_log values(gen_random_uuid(),'${A}','2026-11-28','[]',2400,150,250,70)`));
ok("PR weight -1 rejected",await bad(`insert into public.pr_history values(gen_random_uuid(),'${A}','x','X',-1,0,'2026-11-28')`));
console.log(out.join("\n"));
