-- Review only. Account-preserving destructive action, invoked ONLY by the user after double confirmation.
begin;
create table public.training_generations(user_id uuid primary key references auth.users(id) on delete cascade,generation bigint not null default 0 check(generation>=0));
create table public.training_reset_requests(user_id uuid not null references auth.users(id) on delete cascade,request_id uuid not null,generation bigint not null,created_at timestamptz not null default now(),primary key(user_id,request_id));
alter table public.training_generations enable row level security;
alter table public.training_reset_requests enable row level security;
revoke all on public.training_generations,public.training_reset_requests from public,anon,authenticated;
grant all on public.training_generations,public.training_reset_requests to service_role;
create function public.my_training_generation() returns bigint language plpgsql stable security definer set search_path='' as $$
begin
 if auth.uid() is null then raise exception 'sign_in_required';end if;
 return coalesce((select generation from public.training_generations where user_id=auth.uid()),0);
end $$;
create function public.guard_training_generation() returns trigger language plpgsql security definer set search_path='' as $$
declare uid uuid;g bigint;h text;headers jsonb;
begin
 if TG_TABLE_NAME='profiles' then uid:=new.id;
 elsif TG_OP='DELETE' then uid:=old.user_id;else uid:=new.user_id;end if;
 perform pg_advisory_xact_lock(hashtextextended('gymak-training:'||uid::text,0));
 if TG_TABLE_NAME='profiles' and TG_OP='UPDATE' then
  if (new.level,new.xp,new.xp_next,new.best_streak,new.active_program_id,new.goal_weight) is not distinct from (old.level,old.xp,old.xp_next,old.best_streak,old.active_program_id,old.goal_weight) then return new;end if;
 end if;
 if current_setting('gymak.training_reset_user',true)=uid::text then
  if TG_OP='DELETE' then return old;else return new;end if;
 end if;
 select generation into g from public.training_generations where user_id=uid;g:=coalesce(g,0);
 headers:=coalesce(nullif(current_setting('request.headers',true),''),'{}')::jsonb;h:=headers->>'x-gymak-training-generation';
 if g>0 and h is distinct from g::text then raise exception 'training_generation_changed';end if;
 if TG_OP='DELETE' then return old;else return new;end if;
end $$;
create trigger guard_weight_generation before insert or update or delete on public.weight_logs for each row execute function public.guard_training_generation();
create trigger guard_food_generation before insert or update or delete on public.food_log for each row execute function public.guard_training_generation();
create trigger guard_logs_generation before insert or update or delete on public.exercise_logs for each row execute function public.guard_training_generation();
create trigger guard_pr_generation before insert or update or delete on public.pr_history for each row execute function public.guard_training_generation();
create trigger guard_days_generation before insert or update or delete on public.workout_days for each row execute function public.guard_training_generation();
create trigger guard_profile_generation before insert or update on public.profiles for each row execute function public.guard_training_generation();
create function public.reset_my_training(p_expected_user uuid,p_request uuid,p_confirmation text) returns bigint language plpgsql security definer set search_path='' as $$
declare u uuid:=auth.uid();g bigint;
begin
 if u is null or u is distinct from p_expected_user then raise exception 'session_changed';end if;
 if p_request is null or p_confirmation is distinct from 'RESET TRAINING' then raise exception 'confirmation_required';end if;
 perform pg_advisory_xact_lock(hashtextextended('gymak-training:'||u::text,0));
 select generation into g from public.training_reset_requests where user_id=u and request_id=p_request;
 if found then return g;end if;
 if exists(select 1 from public.training_reset_requests where user_id=u and created_at>now()-interval '1 minute') then raise exception 'reset_rate_limited';end if;
 insert into public.training_generations(user_id,generation) values(u,1) on conflict(user_id) do update set generation=training_generations.generation+1 returning generation into g;
 perform set_config('gymak.training_reset_user',u::text,true);
 delete from public.exercise_logs where user_id=u;
 delete from public.pr_history where user_id=u;
 delete from public.workout_days where user_id=u;
 delete from public.weight_logs where user_id=u;
 delete from public.food_log where user_id=u;
 update public.profiles set level=1,xp=0,xp_next=500,best_streak=0,active_program_id=null,goal_weight=null where id=u;
 insert into public.training_reset_requests(user_id,request_id,generation) values(u,p_request,g);
 return g;
end $$;
revoke all on function public.my_training_generation(),public.guard_training_generation(),public.reset_my_training(uuid,uuid,text) from public,anon,authenticated;
grant execute on function public.my_training_generation(),public.reset_my_training(uuid,uuid,text) to authenticated;
notify pgrst,'reload schema';
commit;
