import Store from './store/gymakStore';
const PENDING='gymak_guest_import_pending_v1',ARCHIVE='gymak_guest_import_archive_v1';
export function markGuestData(storage=localStorage){
 if(storage.getItem(PENDING))return;
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
 for(const r of remote.weights||[]){const l=local.weightLogs?.find(x=>x.date===r.date);if(l&&(Number(l.weight)!==Number(r.weight)||Number(l.bodyFat||0)!==Number(r.body_fat||0)))conflicts.push({key:'weight:'+r.date,type:'weight',label:r.date,local:l,remote:r});}
 for(const r of remote.food||[]){const l=local.foodLog?.find(x=>x.date===r.date);if(l&&JSON.stringify(l.items)!==JSON.stringify(r.items||[]))conflicts.push({key:'food:'+r.date,type:'food',label:r.date,local:l,remote:r});}
 for(const r of remote.exercises||[]){const l=local.exercises?.find(x=>x.custom&&x.id===r.id);if(l&&['name','muscle','sets','reps'].some(k=>l[k]!==r[k]))conflicts.push({key:'exercise:'+r.id,type:'exercise',label:l.name,local:l,remote:r});}
 return conflicts;
}
export async function inspectGuestImport(userId,client){
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
 localStorage.setItem('gymak_training_generation_v1:'+userId,String(generation.data??0));
 Store.clearGuestPendingDeletes();
 Store.mergeWeightLogsFromRemote(review.remote.weights.filter(r=>!preserve.has('weight:'+r.date)));
 Store.mergeFoodLogFromRemote(review.remote.food.filter(r=>!preserve.has('food:'+r.date)));
 Store.mergeExercisesFromRemote(review.remote.exercises.filter(r=>!preserve.has('exercise:'+r.id)));
 if(review.remote.profile)Store.mergeProfileFromRemote(review.remote.profile);
 localStorage.removeItem(PENDING);
 localStorage.setItem('gymak_guest_import_completed_v1',JSON.stringify({userId,at:Date.now()}));
}
