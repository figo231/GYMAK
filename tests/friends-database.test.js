// @vitest-environment node
import {it,expect} from 'vitest';import {PGlite} from '@electric-sql/pglite';import {readFileSync} from 'node:fs';
it('friends require mutual acceptance and per-metric opt-in, blocked peers lose access, anonymous/direct reads fail',async()=>{const db=new PGlite();try{
 await db.exec(`create role authenticated;create role anon;create role service_role;create schema auth;grant usage on schema auth,public to authenticated,anon;create table auth.users(id uuid primary key);create function auth.uid()returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;`);
 await db.exec(readFileSync('supabase/migrations/0001_init.sql','utf8'));
 await db.exec(`create table public.chat_blocks(blocker_id uuid,blocked_id uuid,primary key(blocker_id,blocked_id));create function public.chat_blocked_between(a uuid,b uuid) returns boolean language sql stable as $$select exists(select 1 from public.chat_blocks x where (x.blocker_id=$1 and x.blocked_id=$2) or(x.blocker_id=$2 and x.blocked_id=$1))$$;`);
 await db.exec(readFileSync('supabase/migrations/0057_friends_private.sql','utf8'));
 const a='00000000-0000-4000-8000-000000000001',b='00000000-0000-4000-8000-000000000002',c='00000000-0000-4000-8000-000000000003';
 await db.query('insert into auth.users values($1),($2),($3)',[a,b,c]);await db.query("insert into profiles(id,username) values($1,'alpha'),($2,'bravo'),($3,'charlie') on conflict(id) do update set username=excluded.username",[a,b,c]);
 const as=async id=>{await db.exec('reset role');await db.query("select set_config('request.jwt.claim.sub',$1,false)",[id]);await db.exec('set role authenticated');};const snap=async()=>(await db.query('select friend_snapshot() r')).rows[0].r;
 await as(a);expect((await snap()).settings.discoverable).toBe(false);await expect(db.query("select friend_request('bravo')")).rejects.toThrow('enable_friends_first');await db.exec('select friend_settings(true,false,false,false)');await db.query("select friend_request('bravo')");expect((await snap()).links).toEqual([]);
 await as(b);await db.exec('select friend_settings(true,false,false,false)');await as(a);await db.exec("select friend_request('bravo')");expect((await snap()).board).toEqual([]);await expect(db.query('select friend_respond($1,true)',[b])).rejects.toThrow('request_unavailable');await expect(db.query('select friend_cheer($1)',[b])).rejects.toThrow('friend_unavailable');
 await as(b);expect((await snap()).links[0].incoming).toBe(true);await db.query('select friend_respond($1,true)',[a]);expect((await snap()).board).toEqual([]);await db.exec('select friend_settings(true,true,false,false)');await db.exec('reset role');await db.query("insert into workout_days values($1,(now() at time zone 'Africa/Cairo')::date)",[b]);
 await as(a);let row=(await snap()).board[0];expect(row.peer).toBe(b);expect(row.days).toBe(1);expect(row.streak).toBeNull();expect(row.volume).toBeNull();await db.query('select friend_cheer($1)',[b]);await db.query('select friend_cheer($1)',[b]);
 await as(c);expect((await snap()).board).toEqual([]);await expect(db.query('select * from friend_preferences')).rejects.toThrow(/permission denied/);await expect(db.query('select friend_active($1,$2)',[a,b])).rejects.toThrow(/permission denied/);
 await as(b);expect((await snap()).cheers).toHaveLength(1);await db.exec('reset role');await db.query('insert into chat_blocks values($1,$2)',[b,a]);await as(a);expect((await snap()).board).toEqual([]);expect((await snap()).links).toEqual([]);await expect(db.query('select friend_cheer($1)',[b])).rejects.toThrow('friend_unavailable');

 await as(c);await db.exec('select friend_settings(true,false,false,false)');
 for(let i=0;i<20;i++)await db.query("select friend_request('missing_user')");
 await expect(db.query("select friend_request('missing_user')")).rejects.toThrow('request_limit');
 await as(b);await db.exec('select friend_settings(true,true,true,true)');await db.exec('reset role');await db.exec('delete from chat_blocks');
 await db.query("insert into exercise_logs(id,user_id,exercise_id,date,weight,sets,reps) values(gen_random_uuid(),$1,'bench',(now() at time zone 'Africa/Cairo')::date,20,2,8)",[b]);
 await as(a);row=(await snap()).board[0];expect(row.streak).toBe(1);expect(row.volume).toBe(320);
 await db.query('select friend_block($1)',[b]);expect((await snap()).links).toEqual([]);await db.query("select friend_request('bravo')");expect((await snap()).links).toEqual([]);
 await db.exec('set role anon');await expect(db.query('select friend_snapshot()')).rejects.toThrow(/permission denied/);
 }finally{await db.close();}},20000);
