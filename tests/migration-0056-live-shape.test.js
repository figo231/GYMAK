// @vitest-environment node
// Applies the UNAPPLIED migration 0056 to tables shaped like the live catalog (supabase/snapshots/live-schema-2026-11-27.txt):
// live status check without outcome_unknown, no claimed_at. Nothing touches production.
import {it,expect} from 'vitest';import {PGlite} from '@electric-sql/pglite';import {readFileSync} from 'node:fs';
it('0056 applies on the live table shape and the claim/retry/close cycle behaves',async()=>{const db=new PGlite();try{
await db.exec(`create role authenticated;create role anon;create role service_role;create schema auth;create table auth.users(id uuid primary key);
create table public.push_tokens(id uuid primary key default gen_random_uuid(),user_id uuid not null,device_id text not null default gen_random_uuid()::text,platform text not null default 'android',app_version text,token text not null,language text,timezone text,created_at timestamptz not null default now(),updated_at timestamptz not null default now(),last_seen timestamptz not null default now(),is_active boolean not null default true);
create table public.push_preferences(user_id uuid not null,category text not null,enabled boolean not null,primary key(user_id,category));
create table public.notifications(id uuid primary key default gen_random_uuid(),title text not null,body text not null,image_url text,deep_link text,category text not null default 'general',priority text not null default 'normal',audience_type text not null default 'everyone',audience_ref jsonb,status text not null,scheduled_at timestamptz,sent_at timestamptz,created_by uuid,created_at timestamptz not null default now());
create table public.notification_deliveries(id uuid primary key default gen_random_uuid(),notification_id uuid not null references public.notifications(id) on delete cascade,token_id uuid not null references public.push_tokens(id) on delete cascade,status text not null,error_code text,attempts integer not null default 0,next_retry_at timestamptz,created_at timestamptz not null default now(),unique(notification_id,token_id),constraint notification_deliveries_status_check check(status in('pending','dispatching','sent','failed_temporary','failed_permanent','invalid_token')));`);
await db.exec(readFileSync('supabase/migrations/0056_bounded_broadcast_queue.sql','utf8'));
const u='00000000-0000-4000-8000-0000000000a1',n='00000000-0000-4000-8000-0000000000b1';
await db.query('insert into auth.users values($1)',[u]);await db.query("insert into notifications(id,title,body,status) values($1,'fake','fake','sending')",[n]);
await db.query("insert into push_tokens(user_id,token) select $1,'fake'||i from generate_series(1,8) i",[u]);
expect((await db.query('select enqueue_broadcast_devices_v1($1) c',[n])).rows[0].c).toBe(8);
expect((await db.query('select * from claim_pending_deliveries($1,5)',[n])).rows).toHaveLength(5);
// worker dies: claims older than 5 minutes become outcome_unknown, never re-sent
await db.exec("update notification_deliveries set claimed_at=now()-interval '6 minutes' where status='dispatching'");
expect((await db.query('select * from claim_pending_deliveries($1,5)',[n])).rows).toHaveLength(3);
expect((await db.query("select count(*)::int c from notification_deliveries where status='outcome_unknown'")).rows[0].c).toBe(5);
// temporary failure becomes claimable only when due
await db.exec("update notification_deliveries set status='failed_temporary',attempts=1,next_retry_at=now()+interval '1 hour' where status='dispatching' and id=(select id from notification_deliveries where status='dispatching' limit 1)");
expect((await db.query('select * from claim_due_retries(5)')).rows).toHaveLength(0);
await db.exec("update notification_deliveries set next_retry_at=now()-interval '1 minute' where status='failed_temporary'");
expect((await db.query('select * from claim_due_retries(5)')).rows).toHaveLength(1);
// notification closes as failed when any delivery is unknown/permanent and none are open
await db.exec("update notification_deliveries set status='sent' where status in('dispatching','pending','failed_temporary')");
await db.query('select * from next_broadcast_notification_v1()');
expect((await db.query('select status from notifications where id=$1',[n])).rows[0].status).toBe('failed');
// API roles cannot call the queue functions
for(const r of ['anon','authenticated'])for(const f of ['enqueue_broadcast_devices_v1(uuid)','claim_pending_deliveries(uuid,int)','claim_due_retries(int)','next_broadcast_notification_v1()'])expect((await db.query(`select has_function_privilege('${r}','public.${f}','execute') ok`)).rows[0].ok).toBe(false);
}finally{await db.close()}},60000);
