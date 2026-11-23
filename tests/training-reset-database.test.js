// @vitest-environment node
import{it,expect}from'vitest';import{PGlite}from'@electric-sql/pglite';import{readFileSync}from'node:fs';
it('isolates reset, preserves identity, rejects stale resurrection and makes retries idempotent',async()=>{
 const d=new PGlite();try{await d.exec(`create role authenticated;create role anon;create role service_role;create schema auth;grant usage on schema public,auth to authenticated,anon;create function auth.uid()returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;create table auth.users(id uuid primary key);create table profiles(id uuid primary key,name text,level int,xp int,xp_next int,best_streak int,active_program_id text,goal_weight numeric);`);
 for(const t of['exercise_logs','pr_history','workout_days','weight_logs','food_log'])await d.exec(`create table ${t}(id int,user_id uuid);`);
 const a='00000000-0000-4000-8000-000000000001',b='00000000-0000-4000-8000-000000000002',r='00000000-0000-4000-8000-000000000003';
 await d.query('insert into auth.users values($1),($2)',[a,b]);await d.query("insert into profiles values($1,'Keep owner',3,100,500,9,'p',80),($2,'Other',2,50,500,2,null,null)",[a,b]);
 for(const t of['exercise_logs','pr_history','workout_days','weight_logs','food_log'])await d.query(`insert into ${t} values(1,$1),(2,$2)`,[a,b]);
 await d.exec(readFileSync('supabase/migrations/0032_training_reset.sql','utf8'));await d.query("select set_config('request.jwt.claim.sub',$1,false)",[a]);
 await expect(d.query('select reset_my_training($1,$2,$3)',[b,r,'RESET TRAINING'])).rejects.toThrow('session_changed');
 await expect(d.query('select reset_my_training($1,$2,$3)',[a,r,'no'])).rejects.toThrow('confirmation_required');
 for(let i=0;i<2;i++)expect((await d.query('select reset_my_training($1,$2,$3) g',[a,r,'RESET TRAINING'])).rows[0].g).toBe(1);
 expect((await d.query('select name,xp,level from profiles where id=$1',[a])).rows[0]).toEqual({name:'Keep owner',xp:0,level:1});
 for(const t of['exercise_logs','pr_history','workout_days','weight_logs','food_log']){expect((await d.query(`select count(*)::int n from ${t} where user_id=$1`,[b])).rows[0].n).toBe(1);await expect(d.query(`insert into ${t} values(3,$1)`,[a])).rejects.toThrow('training_generation_changed');}
 await expect(d.query('update profiles set xp=200 where id=$1',[a])).rejects.toThrow('training_generation_changed');
 await d.query("update profiles set name='Still owner' where id=$1",[a]);
 await d.query("select set_config('request.headers',$1,false)",[JSON.stringify({'x-gymak-training-generation':'1'})]);await d.query('insert into exercise_logs values(4,$1)',[a]);
 await d.exec('set role anon');await expect(d.query('select reset_my_training($1,$2,$3)',[a,r,'RESET TRAINING'])).rejects.toThrow(/permission denied/);
 }finally{await d.close();}
});
it('works with the actual base schema, identity triggers and authenticated privileges',async()=>{
 const d=new PGlite();try{
 await d.exec(`create role authenticated;create role anon;create role service_role;create schema auth;grant usage on schema public,auth to authenticated,anon;create table auth.users(id uuid primary key,raw_user_meta_data jsonb default '{}');create function auth.uid()returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;`);
 await d.exec(readFileSync('supabase/migrations/0001_init.sql','utf8'));
 await d.exec(`create table apk18_rollout_control(id boolean primary key default true,identity_signup boolean);insert into apk18_rollout_control values(true,true);`);
 await d.exec(readFileSync('supabase/migrations/0029_signup_identity.sql','utf8'));
 await d.exec(readFileSync('supabase/migrations/0032_training_reset.sql','utf8'));
 const a='00000000-0000-4000-8000-000000000010';await d.query('insert into auth.users(id,raw_user_meta_data) values($1,$2)',[a,{identity_version:'v1',display_name:'Test Only',gender:'male',username:'test_only'}]);
 await d.query("select set_config('request.jwt.claim.sub',$1,false)",[a]);
 await d.exec('set role authenticated');
 const result=await d.query("select reset_my_training($1,'00000000-0000-4000-8000-000000000011','RESET TRAINING') g",[a]);expect(result.rows[0].g).toBe(1);
 expect((await d.query('select my_training_generation() g')).rows[0].g).toBe(1);
 await expect(d.query('select * from training_generations')).rejects.toThrow(/permission denied/);
 await d.exec('reset role');expect((await d.query('select name,username,gender,level,xp from profiles where id=$1',[a])).rows[0]).toEqual({name:'Test Only',username:'test_only',gender:'male',level:1,xp:0});
 }finally{await d.close();}
});
