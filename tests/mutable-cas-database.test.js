// @vitest-environment node
import {it,expect} from 'vitest';import {PGlite} from '@electric-sql/pglite';import {readFileSync} from 'node:fs';
it('atomically rejects stale devices, absent-row insert races, cross-owner writes and unsafe tables',async()=>{const db=new PGlite();try{
 await db.exec(`create role authenticated;create role anon;create schema auth;grant usage on schema auth,public to authenticated,anon;create table auth.users(id uuid primary key);create function auth.uid()returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;`);
 await db.exec(readFileSync('supabase/migrations/0001_init.sql','utf8'));await db.exec(readFileSync('supabase/migrations/0002_sync_support.sql','utf8'));await db.exec(readFileSync('supabase/migrations/0054_mutable_sync_compare_and_swap.sql','utf8'));
 const a='00000000-0000-4000-8000-000000000001',b='00000000-0000-4000-8000-000000000002',id='00000000-0000-4000-8000-000000000003';await db.query('insert into auth.users values($1),($2)',[a,b]);await db.query("select set_config('request.jwt.claim.sub',$1,false)",[a]);await db.exec('set role authenticated');
 const rpc=async(expected,data,del=false,table='weight_logs',key='2026-11-25')=>(await db.query('select sync_mutable_row_v1($1,$2,$3,$4,$5) r',[table,key,expected,data,del])).rows[0].r;
 const row={id,user_id:a,date:'2026-11-25',weight:80,body_fat:null};const first=await rpc(null,row);expect(first.ok).toBe(true);const deviceA=first.remote,deviceB=first.remote;
 const second=await rpc(deviceA,{...row,weight:79});expect(second.remote.weight).toBe(79);
 const stale=await rpc(deviceB,{...row,weight:82});expect(stale.ok).toBe(false);expect(stale.remote.weight).toBe(79);expect((await rpc(null,row)).conflict).toBe(true);
 expect((await rpc(deviceB,null,true)).conflict).toBe(true);expect((await rpc(second.remote,null,true)).ok).toBe(true);
 await expect(rpc(null,{...row,user_id:b})).rejects.toThrow('invalid_sync_owner');await expect(rpc(null,row,false,'admin_users')).rejects.toThrow('invalid_sync_table');await expect(rpc(null,{...row,updated_at:'2099'})).rejects.toThrow('invalid_sync_data');

 const food={id:'00000000-0000-4000-8000-000000000004',user_id:a,date:'2026-11-25',items:[{name:'Food',grams:100}],total_kcal:400,total_protein:20,total_carbs:40,total_fat:10};expect((await rpc(null,food,false,'food_log')).ok).toBe(true);
 const custom={id:'custom-a',user_id:a,name:'Custom',muscle:'chest',secondary:null,sets:3,reps:10};const exercise=await rpc(null,custom,false,'exercises','custom-a');expect(exercise.ok).toBe(true);expect((await rpc(exercise.remote,{...custom,name:'Edited'},false,'exercises','custom-a')).remote.name).toBe('Edited');
 await db.exec('set role anon');await expect(rpc(null,row)).rejects.toThrow(/permission denied/);
 }finally{await db.close();}},20000);
