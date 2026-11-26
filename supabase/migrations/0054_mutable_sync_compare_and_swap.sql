-- Preparation only. Atomic owner-scoped CAS, including absent-row races.
begin;
create function public.sync_mutable_row_v1(p_table text,p_key text,p_expected jsonb,p_data jsonb,p_delete boolean default false) returns jsonb
language plpgsql security definer set search_path='' as $$
declare u uuid:=auth.uid();owner_col text;key_col text;allowed text[];cols text;assignments text;current_row jsonb;result_row jsonb;payload jsonb;
begin
 if u is null then raise exception 'sign_in_required';end if;
 if p_table='profiles' then owner_col:='id';key_col:='id';allowed:=array['id','name','username','bio','avatar','cover','cover_gradient','gender','height_cm','level','xp','xp_next','member_since','goal_weight','active_program_id','best_streak','unit','lang','notif_enabled','notif_time'];
 elsif p_table='weight_logs' then owner_col:='user_id';key_col:='date';allowed:=array['id','user_id','date','weight','body_fat'];
 elsif p_table='food_log' then owner_col:='user_id';key_col:='date';allowed:=array['id','user_id','date','items','total_kcal','total_protein','total_carbs','total_fat'];
 elsif p_table='exercises' then owner_col:='user_id';key_col:='id';allowed:=array['id','user_id','name','muscle','secondary','sets','reps'];
 else raise exception 'invalid_sync_table';end if;
 if p_key is null or length(p_key)>200 or (p_table='profiles' and (p_key<>u::text or p_delete)) then raise exception 'invalid_sync_key';end if;
 if p_data is not null and (jsonb_typeof(p_data)<>'object' or octet_length(p_data::text)>1000000 or exists(select 1 from jsonb_object_keys(p_data) k where not(k=any(allowed)))) then raise exception 'invalid_sync_data';end if;
 perform pg_advisory_xact_lock(hashtextextended('gymak-training:'||u::text,0));
 execute format('select to_jsonb(t) from public.%I t where %I=$1 and %I::text=$2 for update',p_table,owner_col,key_col) into current_row using u,p_key;
 if current_row is distinct from p_expected then return jsonb_build_object('ok',false,'conflict',true,'remote',current_row);end if;
 if p_delete then
  execute format('delete from public.%I where %I=$1 and %I::text=$2',p_table,owner_col,key_col) using u,p_key;
  return jsonb_build_object('ok',true,'remote',null);
 end if;
 if p_data is null or p_data->>key_col is distinct from p_key or p_data->>owner_col is distinct from u::text then raise exception 'invalid_sync_owner';end if;
 payload:=p_data;
 if current_row is not null then
  -- Existing primary keys never change just because a client derives a new id.
  payload:=payload-'id'-owner_col-key_col;
  select string_agg(format('%I=r.%I',k,k),',') into assignments from jsonb_object_keys(payload) k;
  if assignments is null then result_row:=current_row;
  else execute format('update public.%I t set %s from jsonb_populate_record(null::public.%I,$3) r where t.%I=$1 and t.%I::text=$2 returning to_jsonb(t)',p_table,assignments,p_table,owner_col,key_col) into result_row using u,p_key,payload;end if;
 else
  select string_agg(format('%I',k),',') into cols from jsonb_object_keys(payload) k;
  execute format('insert into public.%I(%s) select %s from jsonb_populate_record(null::public.%I,$1) returning to_jsonb(%I)',p_table,cols,cols,p_table,p_table) into result_row using payload;
 end if;
 return jsonb_build_object('ok',true,'remote',result_row);
end $$;
revoke all on function public.sync_mutable_row_v1(text,text,jsonb,jsonb,boolean) from public,anon,authenticated;
grant execute on function public.sync_mutable_row_v1(text,text,jsonb,jsonb,boolean) to authenticated;
notify pgrst,'reload schema';
commit;
