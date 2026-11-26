import Store from '../store/gymakStore';
import {deterministicId} from './deterministicId';
import {readMutableJournal,reconcileMutableRow,rowFingerprint} from './mutableRows';
import {sanitizeProfileForPush,validateWeightLog,validateFoodLog,validateExercise,validateProfileFromRemote} from './validate';
const fields={profiles:['name','username','bio','avatar','cover','cover_gradient','gender','height_cm','level','xp','xp_next','member_since','goal_weight','active_program_id','best_streak','unit','lang','notif_enabled','notif_time'],weight_logs:['date','weight','body_fat'],food_log:['date','items','total_kcal','total_protein','total_carbs','total_fat'],exercises:['id','name','muscle','secondary','sets','reps']};
export const mutableSemantic=(table,row)=>row===null?null:Object.fromEntries(fields[table].map(k=>[k,row[k]??null]));
export function localMutableRows(owner){
 const s=Store.getRawStateForSync(),p=sanitizeProfileForPush(s.profile);
 const profile={id:owner,name:p.name??'',username:p.username??'',bio:p.bio??'',avatar:p.avatar??null,cover:p.cover??null,cover_gradient:p.coverGradient??'g1',gender:p.gender??null,height_cm:p.heightCm??null,level:p.level,xp:p.xp,xp_next:p.xpNext,member_since:p.memberSince,goal_weight:s.goalWeight,active_program_id:s.activeProgramId,best_streak:s.bestStreak,unit:s.settings.unit,lang:s.settings.lang,notif_enabled:s.settings.notifEnabled,notif_time:s.settings.notifTime};
 const validWeight=s.weightLogs.filter(validateWeightLog),validFood=s.foodLog.filter(validateFoodLog),custom=s.exercises.filter(e=>e.custom),validExercise=custom.filter(validateExercise);
 return {rows:{profiles:[profile],weight_logs:validWeight.map(r=>({id:deterministicId('weight_log',owner,r.date),user_id:owner,date:r.date,weight:r.weight,body_fat:r.bodyFat??null})),food_log:validFood.map(r=>({id:deterministicId('food_log',owner,r.date),user_id:owner,date:r.date,items:r.items,total_kcal:r.totalKcal,total_protein:r.totalProtein,total_carbs:r.totalCarbs,total_fat:r.totalFat})),exercises:validExercise.map(r=>({id:r.id,user_id:owner,name:r.name,muscle:r.muscle,secondary:r.secondary||null,sets:r.sets,reps:r.reps}))},dropped:s.weightLogs.length-validWeight.length+s.foodLog.length-validFood.length+custom.length-validExercise.length};
}
const rowKey=(table,r)=>['weight_logs','food_log'].includes(table)?r.date:r.id;
const pendingFor=(table,s)=>table==='weight_logs'?s.pendingDeletes.weight:table==='food_log'?s.pendingDeletes.food:table==='exercises'?(s.deletedExerciseIds||[]):[];
const remoteProperty={profiles:'profile',weight_logs:'weights',food_log:'food',exercises:'exercises'};
export async function syncMutableDomains(owner,client,{canApply=()=>true,applyRemote=fn=>fn()}={}){
 const {data:snapshot,error}=await client.rpc('guest_import_snapshot');if(error)throw error;
 if(!canApply())throw Error('session_changed');
 if(!snapshot||!Array.isArray(snapshot.weights)||!Array.isArray(snapshot.food)||!Array.isArray(snapshot.exercises))throw Error('invalid_mutable_snapshot');
 const captured=localMutableRows(owner),journal=readMutableJournal(owner);let conflicts=0,dropped=captured.dropped;
 if(dropped)throw Error('invalid_local_sync_rows_preserved');
 for(const table of Object.keys(fields)){
  const locals=new Map(captured.rows[table].map(r=>[rowKey(table,r),r]));
  const raw=table==='profiles'?(snapshot.profile?[snapshot.profile]:[]):snapshot[remoteProperty[table]];
  const validator={profiles:validateProfileFromRemote,weight_logs:validateWeightLog,food_log:validateFoodLog,exercises:validateExercise}[table];
  // Invalid remote data is not absence: stop instead of uploading over it.
  if(raw.some(r=>!validator(r)))throw Error('invalid_mutable_remote');
  const remotes=new Map(raw.map(r=>[rowKey(table,r),r])),pending=new Set(pendingFor(table,Store.getRawStateForSync()).filter(key=>table!=='exercises'||remotes.has(key)||locals.has(key)||journal.rows[table+':'+key]));
  const keys=new Set([...locals.keys(),...remotes.keys(),...pending,...Object.keys(journal.rows).filter(k=>k.startsWith(table+':')).map(k=>k.slice(table.length+1))]);
  for(const key of keys){
   if(!canApply())throw Error('session_changed');
   const local=locals.get(key)||null,remote=remotes.get(key)||null,deleted=pending.has(key);
   const result=await reconcileMutableRow({owner,table,key,local,remote,deleted,semantic:r=>mutableSemantic(table,r),client,canApply,applyRemote:(accepted)=>{
    const current=localMutableRows(owner).rows[table].find(r=>rowKey(table,r)===key)||null;
    const stillDeleted=pendingFor(table,Store.getRawStateForSync()).includes(key);
    if(rowFingerprint(current)!==rowFingerprint(local)||stillDeleted!==deleted)return false;
    if(!deleted&&rowFingerprint(mutableSemantic(table,current))===rowFingerprint(mutableSemantic(table,accepted)))return true;
    applyRemote(()=>Store.applySyncedMutableRow(table,key,accepted));return true;
   }});
   if(result.action==='conflict')conflicts++;
  }
 }
 return {dropped,conflicts};
}
