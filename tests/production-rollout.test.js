// @vitest-environment node
import{it,expect}from'vitest';import{PGlite}from'@electric-sql/pglite';import{readFileSync}from'node:fs';
it('rehearses full ordered install with legacy auth trigger and preserves baseline profile/chat data',async()=>{
 const db=new PGlite();try{
 const source=readFileSync('tests/ugc-moderation.test.js','utf8'),baseline=source.match(/const baseline = `([\s\S]*?)`;/)[1];
 await db.exec('create role authenticated;create role anon;create role service_role bypassrls;drop schema public cascade;'+baseline);
 await db.exec(`alter table auth.users add column raw_user_meta_data jsonb default '{}';
 create function handle_new_user() returns trigger language plpgsql as $$begin insert into profiles(id) values(new.id);return new;end$$;
 create trigger on_auth_user_created after insert on auth.users for each row execute function handle_new_user();
 create table push_tokens(id uuid primary key default gen_random_uuid(),user_id uuid,token text,device_id text,platform text,is_active boolean,last_seen timestamptz default now());
 create table push_preferences(user_id uuid,category text,enabled boolean);
 insert into auth.users(id,email) values('00000000-0000-4000-8000-000000000001','owner@test.invalid');
 update profiles set name='Preserved name',username='old_handle',gender='male';
 insert into admin_users values('00000000-0000-4000-8000-000000000001','super_admin');`);
 await db.exec(readFileSync('supabase/migrations/0024_private_chat.sql','utf8'));
 const before=(await db.query('select * from profiles')).rows;
 for(const f of ['0027_ugc_terms_moderation.sql','0028_encouragement.sql','0029_signup_identity.sql','0030_owner_notification_delivery.sql'])await db.exec(readFileSync('supabase/migrations/'+f,'utf8'));
 expect((await db.query('select * from profiles')).rows).toEqual(before);
 expect((await db.query('select enabled from owner_push_control')).rows[0].enabled).toBe(false);
 expect((await db.query('select enabled from encouragement_config')).rows[0].enabled).toBe(false);
 await db.exec('update apk18_rollout_control set identity_signup=true');
 await db.query('insert into auth.users(id,email,raw_user_meta_data) values($1,$2,$3)',['00000000-0000-4000-8000-000000000002','signup@test.invalid',{identity_version:'v1',display_name:'New Name',gender:'female',username:'new_name'}]);
 expect((await db.query("select name,username from profiles where username='new_name'")).rows[0]).toEqual({name:'New Name',username:'new_name'});
 expect((await db.query('select count(*)::int n from chat_messages')).rows[0].n).toBe(0);
 // A mid-migration failure is transactional, no partially-created table survives.
 await expect(db.exec('begin;create table atomic_failure_fixture(id int);select 1/0;commit;')).rejects.toThrow();await db.exec('rollback');
 expect((await db.query("select to_regclass('public.atomic_failure_fixture') as t")).rows[0].t).toBeNull();
 // After writes occur, rollback means pause and preserve, never drop new user rows.
 await db.exec('update apk18_rollout_control set identity_signup=false,chat_writes=false;update owner_push_control set enabled=false;update encouragement_config set enabled=false');
 expect((await db.query("select count(*)::int n from account_identities where username='new_name'")).rows[0].n).toBe(1);
 await expect(db.query('insert into auth.users(id,raw_user_meta_data) values($1,$2)',['00000000-0000-4000-8000-000000000003',{identity_version:'v1',display_name:'Paused Name',gender:'male',username:'paused_name'}])).rejects.toThrow('identity_paused');
 expect((await db.query('select count(*)::int n from profiles')).rows[0].n).toBe(2);

 }finally{await db.close();}
});
