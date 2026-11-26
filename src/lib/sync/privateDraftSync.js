import Store from '../store/gymakStore';
import {generationFor} from '../trainingReset';
import {readDraftQueue,queueDraftRevision,flushDraftQueue,readRemoteDrafts} from '../offlineDrafts';
import {loadMealPlanner,saveMealPlanner,validMealPlanner} from '../mealPlannerDraft';
import {rowFingerprint} from './mutableRows';
const ackKey=owner=>'gymak_private_draft_ack_v1:'+owner;
const remoteKey=owner=>'gymak_private_draft_remote_v1:'+owner;
function readAck(owner){const raw=localStorage.getItem(ackKey(owner));if(!raw)return {};let x;try{x=JSON.parse(raw);}catch{throw Error('draft_ack_corrupt');}if(!x||typeof x!=='object'||Array.isArray(x))throw Error('draft_ack_corrupt');return x;}
export function capturePrivateDrafts(owner){
 if(localStorage.getItem('gymak_local_data_owner_v1')!==owner)throw Error('session_changed');
 const state=Store.getRawStateForSync(),session=Store.getWorkoutSession(),meal=loadMealPlanner(owner),ack=readAck(owner),queue=readDraftQueue(owner),candidates=[];
 if(session)candidates.push({kind:'workout',entity:session.id,payload:{session,logs:Object.fromEntries(session.exercises.map(e=>[e.id,(state.exerciseLogs[e.id]||[]).filter(l=>l.at>=session.startedAt)]))}});
 if(meal)candidates.push({kind:'meal_plan',entity:meal.id,payload:meal});
 for(const c of candidates){c.payload={...c.payload,trainingGeneration:String(generationFor(owner))};const fp=rowFingerprint(c.payload),id=c.kind+':'+c.entity;if(ack[id]===fp||queue.some(r=>r.kind===c.kind&&r.entity===c.entity&&rowFingerprint(r.payload)===fp))continue;queueDraftRevision(owner,c.kind,c.entity,c.payload);}
}
export function cachedPrivateDrafts(owner){const raw=localStorage.getItem(remoteKey(owner));if(!raw)return [];let rows;try{rows=JSON.parse(raw);}catch{throw Error('draft_remote_cache_corrupt');}if(!Array.isArray(rows))throw Error('draft_remote_cache_corrupt');return rows;}
export async function syncPrivateDrafts(owner,client,canApply=()=>true){
 if(!canApply())throw Error('session_changed');capturePrivateDrafts(owner);
 const captured=readDraftQueue(owner);await flushDraftQueue(owner,client,localStorage,canApply);if(!canApply())throw Error('session_changed');
 const ack=readAck(owner);for(const row of captured)ack[row.kind+':'+row.entity]=rowFingerprint(row.payload);localStorage.setItem(ackKey(owner),JSON.stringify(ack));
 const remote=await readRemoteDrafts(owner,client);if(!canApply())throw Error('session_changed');localStorage.setItem(remoteKey(owner),JSON.stringify(remote));
 return {revisions:remote.length};
}
export function restorePrivateDraft(owner,row){
 if(localStorage.getItem('gymak_local_data_owner_v1')!==owner||row.user_id&&row.user_id!==owner)throw Error('session_changed');
 if(String(row.payload?.trainingGeneration??'0')!==String(generationFor(owner)))throw Error('draft_before_training_reset');
 if(!cachedPrivateDrafts(owner).some(r=>r.id===row.id&&rowFingerprint(r)===rowFingerprint(row)))throw Error('draft_review_changed');
 // Keep a separate original before any replacement. Failure stops restoration.
 const original={state:localStorage.getItem('gymak_state_v1'),meal:localStorage.getItem('gymak_meal_planner_v1:'+owner),at:Date.now()};
 localStorage.setItem('gymak_before_draft_restore_v1:'+owner,JSON.stringify(original));
 if(row.kind==='meal_plan'){if(!validMealPlanner(row.payload))throw Error('invalid_meal_plan');saveMealPlanner(owner,row.payload);}
 else if(row.kind==='workout')Store.restoreWorkoutRevision(owner,row.payload);
 else throw Error('invalid_draft_kind');
}
