begin;
create table public.guest_import_receipts(user_id uuid not null references auth.users(id) on delete cascade,request_id uuid not null,payload jsonb not null,result jsonb not null,created_at timestamptz not null default now(),primary key(user_id,request_id));
alter table public.guest_import_receipts enable row level security;
revoke all on public.guest_import_receipts from public,anon,authenticated;
create function public.guest_exercise_lock() returns trigger language plpgsql security definer set search_path='' as $$begin
 perform pg_advisory_xact_lock(hashtextextended('gymak-training:'||coalesce(new.user_id,old.user_id)::text,0));
 if TG_OP='DELETE' then return old;else return new;end if;
end $$;
create trigger guest_exercise_lock before insert or update or delete on public.exercises for each row execute function public.guest_exercise_lock();
create function public.guest_import_snapshot() returns jsonb language plpgsql security definer set search_path='' as $$declare u uuid:=auth.uid();result jsonb;begin
 if u is null then raise exception 'sign_in_required';end if;
 perform pg_advisory_xact_lock(hashtextextended('gymak-training:'||u::text,0));
 select jsonb_build_object('generation',coalesce((select generation from public.training_generations where user_id=u),0),'weights',coalesce((select jsonb_agg(to_jsonb(w) order by w.date) from public.weight_logs w where user_id=u),'[]'::jsonb),'food',coalesce((select jsonb_agg(to_jsonb(f) order by f.date) from public.food_log f where user_id=u),'[]'::jsonb),'exercises',coalesce((select jsonb_agg(to_jsonb(e) order by e.id) from public.exercises e where user_id=u),'[]'::jsonb),'profile',(select to_jsonb(p) from public.profiles p where p.id=u)) into result;
 return result;
end $$;
create function public.guest_import_commit(p_user uuid,p_request uuid,p_expected jsonb,p_data jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare u uuid:=auth.uid();prior public.guest_import_receipts;result jsonb;r jsonb;p jsonb;g bigint;
begin
 if u is null or u is distinct from p_user then raise exception 'session_changed';end if;
 if p_request is null or p_expected is null or p_data is null or octet_length(p_data::text)>8000000 then raise exception 'invalid_import';end if;
 perform pg_advisory_xact_lock(hashtextextended('gymak-training:'||u::text,0));
 select * into prior from public.guest_import_receipts where user_id=u and request_id=p_request;
 if found then
  if prior.payload is distinct from jsonb_build_object('expected',p_expected,'data',p_data) then raise exception 'import_request_changed';end if;
  return prior.result;
 end if;
 if (select count(*) from public.guest_import_receipts where user_id=u and created_at>now()-interval '1 day')>=10 then raise exception 'import_rate_limit';end if;
 if public.guest_import_snapshot() is distinct from p_expected then raise exception 'guest_remote_changed';end if;
 g:=(p_expected->>'generation')::bigint;
 perform set_config('request.headers',jsonb_build_object('x-gymak-training-generation',g::text)::text,true);
 for r in select value from jsonb_array_elements(p_data->'weights') loop
  insert into public.weight_logs(id,user_id,date,weight,body_fat) values((r->>'id')::uuid,u,(r->>'date')::date,(r->>'weight')::numeric,(r->>'body_fat')::numeric) on conflict(user_id,date) do update set weight=excluded.weight,body_fat=excluded.body_fat;
 end loop;
 for r in select value from jsonb_array_elements(p_data->'food') loop
  insert into public.food_log(id,user_id,date,items,total_kcal,total_protein,total_carbs,total_fat) values((r->>'id')::uuid,u,(r->>'date')::date,r->'items',(r->>'total_kcal')::numeric,(r->>'total_protein')::numeric,(r->>'total_carbs')::numeric,(r->>'total_fat')::numeric) on conflict(user_id,date) do update set items=excluded.items,total_kcal=excluded.total_kcal,total_protein=excluded.total_protein,total_carbs=excluded.total_carbs,total_fat=excluded.total_fat;
 end loop;
 for r in select value from jsonb_array_elements(p_data->'exercises') loop
  if exists(select 1 from public.exercises where id=r->>'id' and user_id<>u) then raise exception 'exercise_id_in_use';end if;
  insert into public.exercises(id,user_id,name,muscle,secondary,sets,reps) values(r->>'id',u,r->>'name',r->>'muscle',r->>'secondary',(r->>'sets')::integer,(r->>'reps')::integer) on conflict(id) do update set name=excluded.name,muscle=excluded.muscle,secondary=excluded.secondary,sets=excluded.sets,reps=excluded.reps where exercises.user_id=u;
  if not found then raise exception 'exercise_id_in_use';end if;
 end loop;
 for r in select value from jsonb_array_elements(p_data->'logs') loop
  insert into public.exercise_logs(id,user_id,exercise_id,date,weight,sets,reps) values((r->>'id')::uuid,u,r->>'exercise_id',(r->>'date')::date,(r->>'weight')::numeric,(r->>'sets')::integer,(r->>'reps')::integer) on conflict do nothing;
 end loop;
 for r in select value from jsonb_array_elements(p_data->'prs') loop
  insert into public.pr_history(id,user_id,exercise_id,exercise_name,date,weight,prev_weight) values((r->>'id')::uuid,u,r->>'exercise_id',r->>'exercise_name',(r->>'date')::date,(r->>'weight')::numeric,(r->>'prev_weight')::numeric) on conflict do nothing;
 end loop;
 for r in select value from jsonb_array_elements(p_data->'days') loop
  insert into public.workout_days(user_id,date) values(u,(r#>>'{}')::date) on conflict do nothing;
 end loop;
 p:=p_data->'profile';
 update public.profiles set height_cm=(p->>'height_cm')::numeric,gender=p->>'gender',goal_weight=(p->>'goal_weight')::numeric,active_program_id=p->>'active_program_id',unit=p->>'unit',lang=p->>'lang',migrated_at=coalesce(migrated_at,now()) where id=u;
 result:=public.guest_import_snapshot();
 insert into public.guest_import_receipts(user_id,request_id,payload,result) values(u,p_request,jsonb_build_object('expected',p_expected,'data',p_data),result);
 return result;
end $$;
revoke all on function public.guest_exercise_lock(),public.guest_import_snapshot(),public.guest_import_commit(uuid,uuid,jsonb,jsonb) from public,anon,authenticated;
grant execute on function public.guest_import_snapshot(),public.guest_import_commit(uuid,uuid,jsonb,jsonb) to authenticated;
notify pgrst,'reload schema';
commit;
