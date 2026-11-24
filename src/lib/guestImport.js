import Store from './store/gymakStore';
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
 const remote={};for(const [key,table] of [['weights','weight_logs'],['food','food_log'],['exercises','exercises']]){const r=await client.from(table).select('*').eq('user_id',userId);if(r.error)throw r.error;remote[key]=r.data||[];}
 const profile=await client.from('profiles').select('*').eq('id',userId).maybeSingle();if(profile.error)throw profile.error;remote.profile=profile.data;
 return {userId,remote,conflicts:findGuestConflicts(Store.getRawStateForSync(),remote)};
}
export async function finishGuestImport(review,choices,client){
 const {userId}=review;const verified=await client.auth.getUser();if(verified.error||verified.data?.user?.id!==userId)throw Error('session_changed');
 for(const c of review.conflicts)if(!['local','remote'].includes(choices[c.key]))throw Error('conflict_choice_required');
 // Re-read before committing. If cloud records changed, ask for a fresh review.
 const fresh=await inspectGuestImport(userId,client);if(JSON.stringify(fresh.remote)!==JSON.stringify(review.remote))throw Error('guest_remote_changed');
 localStorage.setItem(ARCHIVE+':review:'+userId,JSON.stringify(review));
 const preserve=new Set(review.conflicts.filter(c=>choices[c.key]==='local').map(c=>c.key));
 const generation=await client.rpc('my_training_generation');if(generation.error)throw generation.error;
 const finalUser=await client.auth.getUser();if(finalUser.error||finalUser.data?.user?.id!==userId)throw Error('session_changed');
 localStorage.setItem('gymak_training_generation_v1:'+userId,String(generation.data??0));
 const state=JSON.parse(JSON.stringify(Store.getRawStateForSync()));
 state.pendingDeletes={weight:[],food:[],exerciseLogs:[],prs:[]};state.deletedExerciseIds=[];
 const merge=(local,remote,key,shape,type)=>{const rows=new Map(local.map(r=>[r[key],r]));for(const r of remote){if(!preserve.has(type+':'+r[key]))rows.set(r[key],{...rows.get(r[key]),...shape(r)});}return [...rows.values()];};
 state.weightLogs=merge(state.weightLogs,review.remote.weights,'date',r=>({date:r.date,weight:Number(r.weight),bodyFat:r.body_fat==null?null:Number(r.body_fat)}),'weight').sort((a,b)=>a.date.localeCompare(b.date));
 state.foodLog=merge(state.foodLog,review.remote.food,'date',r=>({date:r.date,items:r.items||[],totalKcal:Number(r.total_kcal)||0,totalProtein:Number(r.total_protein)||0,totalCarbs:Number(r.total_carbs)||0,totalFat:Number(r.total_fat)||0}),'food').sort((a,b)=>a.date.localeCompare(b.date));
 state.exercises=merge(state.exercises,review.remote.exercises,'id',r=>({id:r.id,name:r.name,muscle:r.muscle,muscleLabel:Store.getMuscleMeta(r.muscle).label,secondary:r.secondary||'',sets:r.sets,reps:r.reps,custom:true}),'exercise');
 if(review.remote.profile){const p=review.remote.profile;
  for(const [r,l] of [['name','name'],['username','username'],['bio','bio'],['avatar','avatar'],['cover','cover'],['cover_gradient','coverGradient'],['level','level'],['xp','xp'],['xp_next','xpNext']])if(p[r]!=null)state.profile[l]=p[r];
  if(!preserve.has('profile:training'))for(const [r,l] of profileFields)if(p[r]!=null){if(['unit','lang'].includes(l))state.settings[l]=p[r];else if(['goalWeight','activeProgramId'].includes(l))state[l]=p[r];else state.profile[l]=p[r];}
  state.bestStreak=Math.max(state.bestStreak,p.best_streak||0);
 }
 // Commit the complete merge once. A quota error leaves the previous state intact.
 const merged=JSON.stringify(state);localStorage.setItem('gymak_state_v1',merged);if(localStorage.getItem('gymak_state_v1')!==merged)throw Error('import_save_failed');Store.invalidateCache();
 bindDataOwner(userId);
 localStorage.removeItem(PENDING);
 localStorage.setItem('gymak_guest_import_completed_v1',JSON.stringify({userId,at:Date.now()}));
}
