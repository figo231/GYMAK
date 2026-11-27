// @vitest-environment node
// Replays every repo migration on a stub Supabase schema (no production access).
// Known, documented exceptions: 0015-0017 depend on objects created by 0018/0020 (applied out of order
// in production; 0006-0014 are not in the repo), and 0048 needs pg_cron/pg_net (hosted-only).
import {it,expect} from 'vitest';import {PGlite} from '@electric-sql/pglite';import {readFileSync,readdirSync} from 'node:fs';
const KNOWN=['0015_sprint10_dispatch_support.sql','0016_admin_profiles_read.sql','0017_admin_topic_subscriptions_read.sql','0048_chat_free_schedules.sql'];
it('all other migrations replay in order on a stub schema',async()=>{const db=new PGlite();try{

await db.exec(`create role authenticated;create role anon;create role service_role;create role postgres_x;create schema auth;create schema storage;create schema extensions;grant usage on schema auth,public to authenticated,anon;create table auth.users(id uuid primary key,email text,raw_user_meta_data jsonb,created_at timestamptz default now());create function auth.uid()returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;create function auth.role()returns text language sql as $$select 'authenticated'$$;create function auth.jwt()returns jsonb language sql as $$select '{}'::jsonb$$;create function storage.foldername(n text)returns text[] language sql as $$select string_to_array(n,'/')$$;create table storage.buckets(id text primary key,name text,public bool,file_size_limit bigint,allowed_mime_types text[]);create table storage.objects(id uuid default gen_random_uuid() primary key,bucket_id text,name text,owner uuid,metadata jsonb,created_at timestamptz default now());alter table storage.objects enable row level security;`);

const failed=[];for(const f of readdirSync('supabase/migrations').sort()){try{await db.exec(readFileSync('supabase/migrations/'+f,'utf8'))}catch(e){try{await db.exec('rollback')}catch{};failed.push(f)}}
expect(failed).toEqual(KNOWN);}finally{await db.close()}},60000);
