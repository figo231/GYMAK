// @vitest-environment node
// PROPOSED migration only (supabase/proposed/0064). Replays repo migrations on a stub schema, applies the proposal,
// checks the effect. Nothing here touches production. The hosted-only parts (Supabase roles, pg_cron) are not proven.
import {it,expect} from 'vitest';import {PGlite} from '@electric-sql/pglite';import {readFileSync,readdirSync} from 'node:fs';
const FNS={rpc:['apk18_capabilities()','coach_can_see(uuid)','is_coach(uuid)','professional_directory(text,uuid)','professional_directory_v2(text,uuid)'],trigger:['feedback_rate_limit()','handle_new_user()','touch_updated_at()','rls_auto_enable()']};
const can=async(db,role,fn)=>(await db.query(`select has_function_privilege('${role}','public.${fn}','execute') as ok`)).rows[0].ok;
it('proposed anon revoke: anon loses all nine, authenticated keeps the RPCs, triggers still fire, rollback restores',async()=>{const db=new PGlite();try{
await db.exec(`create role authenticated;create role anon;create role service_role;create role postgres_x;create schema auth;create schema storage;create schema extensions;grant usage on schema auth,public to authenticated,anon;create table auth.users(id uuid primary key,email text,raw_user_meta_data jsonb,created_at timestamptz default now());create function auth.uid()returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;create function auth.role()returns text language sql as $$select 'authenticated'$$;create function auth.jwt()returns jsonb language sql as $$select '{}'::jsonb$$;create function storage.foldername(n text)returns text[] language sql as $$select string_to_array(n,'/')$$;create table storage.buckets(id text primary key,name text,public bool,file_size_limit bigint,allowed_mime_types text[]);create table storage.objects(id uuid default gen_random_uuid() primary key,bucket_id text,name text,owner uuid,metadata jsonb,created_at timestamptz default now());alter table storage.objects enable row level security;`);
for(const f of readdirSync('supabase/migrations').sort()){try{await db.exec(readFileSync('supabase/migrations/'+f,'utf8'))}catch(e){try{await db.exec('rollback')}catch{}}}
await db.exec("create function public.rls_auto_enable() returns event_trigger language plpgsql as $$ begin null; end $$; grant execute on function public.rls_auto_enable() to anon,authenticated,service_role;");
for(const fn of [...FNS.rpc,...FNS.trigger])expect(await can(db,'anon',fn),'before: anon can run '+fn).toBe(true);
await db.exec(readFileSync('supabase/proposed/0064_revoke_anon_execute.sql','utf8'));
for(const fn of [...FNS.rpc,...FNS.trigger])expect(await can(db,'anon',fn),'after: anon must not run '+fn).toBe(false);
for(const fn of FNS.rpc){expect(await can(db,'authenticated',fn),fn).toBe(true);expect(await can(db,'service_role',fn),fn).toBe(true);}
for(const fn of FNS.trigger)expect(await can(db,'authenticated',fn),'trigger fn not an API function: '+fn).toBe(false);
// a trigger function must still fire for a role that cannot execute it directly
await db.exec("insert into auth.users(id,email) values('00000000-0000-0000-0000-0000000000aa','fake@example.invalid')");
await db.exec("grant insert,select on public.feedback to authenticated");
await db.exec("set role authenticated; select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-0000000000aa',false)");
let limited=0;for(let i=0;i<7;i++){try{await db.exec("insert into public.feedback(user_id,message) values('00000000-0000-0000-0000-0000000000aa','fake message')");}catch(e){if(/rate_limited/.test(String(e.message)))limited++;else throw e;}}
await db.exec("reset role");
expect(limited,'rate-limit trigger still works after revoke').toBe(2);
// rollback text from the file restores the old state
for(const fn of [...FNS.rpc,...FNS.trigger])await db.exec(`grant execute on function public.${fn} to anon,authenticated,service_role`);
for(const fn of [...FNS.rpc,...FNS.trigger])expect(await can(db,'anon',fn)).toBe(true);
}finally{await db.close()}},90000);
