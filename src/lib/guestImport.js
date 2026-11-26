import {exerciseLogId} from "./sync/exerciseLogIdentity";
import Store from './store/gymakStore';
import {deterministicId} from './sync/deterministicId';
const profileFields=[['height_cm','heightCm'],['gender','gender'],['goal_weight','goalWeight'],['active_program_id','activeProgramId'],['unit','unit'],['lang','lang']];
function profileValues(s){return {heightCm:s.profile?.heightCm,gender:s.profile?.gender,goalWeight:s.goalWeight,activeProgramId:s.activeProgramId,unit:s.settings?.unit,lang:s.settings?.lang};}
const OWNER='gymak_local_data_owner_v1';
export function dataOwner(storage=localStorage){
 const owner=storage.getItem(OWNER);if(owner)return owner;
 let ids=[];try{ids=JSON.parse(storage.getItem('gymak_sync_state_v1')||'{}').migratedUserIds||[];}catch{}
 if(ids.length===1){storage.setItem(OWNER,ids[0]);return ids[0];}
 if(ids.length>1)return 'ambiguous_legacy_owner';
 return null;
}
export function bindDataOwner(id,storage=localStorage){const owner=dataOwner(storage);if(owner&&owner!==id)throw Error('different_local_account');storage.setItem(OWNER,id);}
const PENDING='gymak_guest_import_pending_v1',ARCHIVE='gymak_guest_import_archive_v1';
export function markGuestData(storage=localStorage){
 if(dataOwner(storage)||storage.getItem(PENDING))return;
 // Keep the full original state intact. Never clear it to enforce login.
 if(storage.getItem('gymak_state_v1'))storage.setItem(PENDING,JSON.stringify({created:Date.now()}));
}
export function hasGuestImport(storage=localStorage){return !!storage.getItem(PENDING);}
export function archiveGuestData(userId,storage=localStorage){
 const previous=JSON.parse(storage.getItem(ARCHIVE+':'+userId)||'null');
 if(previous)return previous;
 const data={};for(let i=0;i<storage.length;i++){const k=storage.key(i);if(k?.startsWith('gymak_')&&!k.includes('push')&&!k.includes('device')&&!k.includes('guest_import'))data[k]=storage.getItem(k);}
 const archive={userId,created:Date.now(),data};storage.setItem(ARCHIVE+':'+userId,JSON.stringify(archive));
 if(!storage.getItem(ARCHIVE+':'+userId))throw Error('guest_backup_failed');return archive;
}
export function findGuestConflicts(local,remote){
 const conflicts=[];
 for(const r of remote.weights||[]){const l=local.weightLogs?.find(x=>x.date===r.date);if(l&&(Number(l.weight)!==Number(r.weight)||(l.bodyFat??null)!==(r.body_fat==null?null:Number(r.body_fat))))conflicts.push({key:'weight:'+r.date,type:'weight',label:r.date,local:l,remote:r});}
 for(const r of remote.food||[]){const l=local.foodLog?.find(x=>x.date===r.date);if(l&&(JSON.stringify(l.items)!==JSON.stringify(r.items||[])||[['totalKcal','total_kcal'],['totalProtein','total_protein'],['totalCarbs','total_carbs'],['totalFat','total_fat']].some(([a,b])=>Number(l[a]||0)!==Number(r[b]||0))))conflicts.push({key:'food:'+r.date,type:'food',label:r.date,local:l,remote:r});}
 for(const r of remote.exercises||[]){const l=local.exercises?.find(x=>x.custom&&x.id===r.id);if(l&&['name','muscle','secondary','sets','reps'].some(k=>l[k]!==r[k]))conflicts.push({key:'exercise:'+r.id,type:'exercise',label:l.name,local:l,remote:r});}
 if(remote.profile){const values=profileValues(local),account={};for(const [r,l] of profileFields)account[l]=remote.profile[r]??values[l];if(JSON.stringify(values)!==JSON.stringify(account))conflicts.push({key:'profile:training',type:'profile',label:'',local:values,remote:account});}
 return conflicts;
}
export async function inspectGuestImport(userId,client){
 const owner=dataOwner();if(owner&&owner!==userId)throw Error('different_local_account');
 archiveGuestData(userId);
 const verified=await client.auth.getUser();if(verified.error||verified.data?.user?.id!==userId)throw Error('session_changed');
 const pending=JSON.parse(localStorage.getItem('gymak_guest_import_request_v1:'+userId)||'null');
 if(pending)return {userId,remote:pending.p_expected,conflicts:[],resuming:true};
 const snapshot=await client.rpc('guest_import_snapshot');if(snapshot.error)throw snapshot.error;const remote=snapshot.data;
 return {userId,remote,conflicts:findGuestConflicts(Store.getRawStateForSync(),remote)};
}
export async function finishGuestImport(review,choices,client){
 const {userId}=review;const verified=await client.auth.getUser();if(verified.error||verified.data?.user?.id!==userId)throw Error('session_changed');
 for(const c of review.conflicts)if(!['local','remote'].includes(choices[c.key]))throw Error('conflict_choice_required');
 const preserve=new Set(review.conflicts.filter(c=>choices[c.key]==='local').map(c=>c.key));
 localStorage.setItem(ARCHIVE+':review:'+userId,JSON.stringify(review));
 const stagedKey='gymak_guest_import_request_v1:'+userId;
 let request=JSON.parse(localStorage.getItem(stagedKey)||'null');
 if(!request){
  const local=Store.getRawStateForSync(),select=(type,key)=>!review.conflicts.some(c=>c.key===type+':'+key)||preserve.has(type+':'+key);
  const profile={};for(const [r,l] of profileFields)profile[r]=preserve.has('profile:training')?(profileValues(local)[l]??null):(review.remote.profile?.[r]??profileValues(local)[l]??null);
  const data={profile,
   weights:local.weightLogs.filter(r=>select('weight',r.date)).map(r=>({id:deterministicId('weight_log',userId,r.date),date:r.date,weight:r.weight,body_fat:r.bodyFat??null})),
   food:local.foodLog.filter(r=>select('food',r.date)).map(r=>({id:deterministicId('food_log',userId,r.date),date:r.date,items:r.items,total_kcal:r.totalKcal,total_protein:r.totalProtein,total_carbs:r.totalCarbs,total_fat:r.totalFat})),
   exercises:local.exercises.filter(r=>r.custom&&select('exercise',r.id)).map(({id,name,muscle,secondary,sets,reps})=>({id,name,muscle,secondary,sets,reps})),
   logs:Object.entries(local.exerciseLogs).flatMap(([exercise_id,rows])=>rows.map(r=>({id:exerciseLogId(userId,exercise_id,r),exercise_id,...r}))),
   prs:local.prHistory.map(r=>({id:deterministicId('pr',userId,r.exerciseId,r.date,r.weight,r.prevWeight),exercise_id:r.exerciseId,exercise_name:r.exerciseName,date:r.date,weight:r.weight,prev_weight:r.prevWeight})),days:local.workoutDays};
  request={p_user:userId,p_request:crypto.randomUUID(),p_expected:review.remote,p_data:data};localStorage.setItem(stagedKey,JSON.stringify(request));
 }
 bindDataOwner(userId);
 const committed=await client.rpc('guest_import_commit',request);if(committed.error){if(committed.error.message?.includes('guest_remote_changed'))localStorage.removeItem(stagedKey);throw committed.error;}
 const finalUser=await client.auth.getUser();if(finalUser.error||finalUser.data?.user?.id!==userId)throw Error('session_changed');
 const remote=committed.data;localStorage.setItem('gymak_training_generation_v1:'+userId,String(remote.generation));
 const state=JSON.parse(JSON.stringify(Store.getRawStateForSync()));
 state.pendingDeletes={weight:[],food:[],exerciseLogs:[],prs:[]};state.deletedExerciseIds=[];
 const merge=(local,remote,key,shape,type)=>{const rows=new Map(local.map(r=>[r[key],r]));for(const r of remote){rows.set(r[key],{...rows.get(r[key]),...shape(r)});}return [...rows.values()];};
 state.weightLogs=merge(state.weightLogs,remote.weights,'date',r=>({date:r.date,weight:Number(r.weight),bodyFat:r.body_fat==null?null:Number(r.body_fat)}),'weight').sort((a,b)=>a.date.localeCompare(b.date));
 state.foodLog=merge(state.foodLog,remote.food,'date',r=>({date:r.date,items:r.items||[],totalKcal:Number(r.total_kcal)||0,totalProtein:Number(r.total_protein)||0,totalCarbs:Number(r.total_carbs)||0,totalFat:Number(r.total_fat)||0}),'food').sort((a,b)=>a.date.localeCompare(b.date));
 state.exercises=merge(state.exercises,remote.exercises,'id',r=>({id:r.id,name:r.name,muscle:r.muscle,muscleLabel:Store.getMuscleMeta(r.muscle).label,secondary:r.secondary||'',sets:r.sets,reps:r.reps,custom:true}),'exercise');
 if(remote.profile){const p=remote.profile;
  for(const [r,l] of [['name','name'],['username','username'],['bio','bio'],['avatar','avatar'],['cover','cover'],['cover_gradient','coverGradient'],['level','level'],['xp','xp'],['xp_next','xpNext']])if(p[r]!=null)state.profile[l]=p[r];
  for(const [r,l] of profileFields)if(p[r]!=null){if(['unit','lang'].includes(l))state.settings[l]=p[r];else if(['goalWeight','activeProgramId'].includes(l))state[l]=p[r];else state.profile[l]=p[r];}
  state.bestStreak=Math.max(state.bestStreak,p.best_streak||0);
 }
 // Commit the complete merge once. A quota error leaves the previous state intact.
 const merged=JSON.stringify(state);localStorage.setItem('gymak_state_v1',merged);if(localStorage.getItem('gymak_state_v1')!==merged)throw Error('import_save_failed');Store.invalidateCache();
 localStorage.setItem('gymak_guest_import_remote_committed_v1',userId);
 bindDataOwner(userId);
 localStorage.removeItem(stagedKey);localStorage.removeItem(PENDING);
 localStorage.setItem('gymak_guest_import_completed_v1',JSON.stringify({userId,at:Date.now()}));
}
