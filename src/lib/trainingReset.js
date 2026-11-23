import Store from './store/gymakStore';
const GENERATION='gymak_training_generation_v1:',PENDING='gymak_training_reset_pending_v1';
let activeUser=null,headerGeneration='0';
const storedGeneration=id=>localStorage.getItem(GENERATION+id)||'0';
export const generationFor=id=>id===activeUser?headerGeneration:storedGeneration(id);
export const setTrainingUser=id=>{if(activeUser===id)return;activeUser=id;headerGeneration=id?storedGeneration(id):'0';};
function assertActive(userId){if(activeUser&&activeUser!==userId)throw Error('session_changed');}
function acceptGeneration(id,generation){localStorage.setItem(GENERATION+id,generation);if(id===activeUser)headerGeneration=generation;}
export function trainingFetch(input,init={}){const headers=new Headers(init.headers||{});if(activeUser)headers.set('x-gymak-training-generation',headerGeneration);return fetch(input,{...init,headers});}
async function deletePhotos(){if(typeof indexedDB==='undefined')return;await new Promise((resolve,reject)=>{const r=indexedDB.deleteDatabase('gymak_photos_v1');r.onsuccess=resolve;r.onerror=()=>reject(Error('photo_cleanup_failed'));r.onblocked=()=>reject(Error('photo_cleanup_blocked'));});}
export async function clearTrainingLocally(assertUser=()=>{}){
 assertUser();await deletePhotos();assertUser();
 Store.resetTrainingData();
 for(const key of ['gymak_measure_v1','gymak_water_v1','gymak_rest_v1','gymak_challenge30_v1','gymak_weekly_challenge_v1','gymak_migration_snapshot_v1'])localStorage.removeItem(key);
 Store.invalidateCache();
}
export async function reconcileTrainingGeneration(userId,client){
 const {data,error}=await client.rpc('my_training_generation');if(error)throw error;const generation=String(data??0),changed=generation!==generationFor(userId);
 if(generation!==generationFor(userId)){localStorage.setItem(PENDING,JSON.stringify({user:userId,generation,remoteDone:true}));await clearTrainingLocally(()=>assertActive(userId));acceptGeneration(userId,generation);localStorage.removeItem(PENDING);}
 return changed;
}
export async function performTrainingReset(userId,client,manager){
 if(!navigator.onLine)throw Error('reset_online_required');
 const {data,error}=await client.auth.getUser();if(error||data?.user?.id!==userId)throw Error('session_changed');
 await manager.pauseForReset();
 let marker;try{marker=JSON.parse(localStorage.getItem(PENDING)||'null');}catch{}
 if(marker?.user===userId&&marker.remoteDone){await resumePendingReset(userId,client);manager.start(userId);return;}
 if(!marker||marker.user!==userId)marker={user:userId,request:crypto.randomUUID()};localStorage.setItem(PENDING,JSON.stringify(marker));
 try{
 const result=await client.rpc('reset_my_training',{p_expected_user:userId,p_request:marker.request,p_confirmation:'RESET TRAINING'});if(result.error)throw result.error;
 marker={...marker,generation:String(result.data),remoteDone:true};localStorage.setItem(PENDING,JSON.stringify(marker));
 const check=await client.auth.getUser();if(check.error||check.data?.user?.id!==userId)throw Error('session_changed');
 await clearTrainingLocally(()=>assertActive(userId));acceptGeneration(userId,marker.generation);localStorage.removeItem(PENDING);manager.start(userId);
 }catch(e){throw e;}
}
export async function resumePendingReset(userId,client){
 let m;try{m=JSON.parse(localStorage.getItem(PENDING)||'null');}catch{}
 if(!m||m.user!==userId)return;
 if(!m.remoteDone){const {data,error}=await client.rpc('reset_my_training',{p_expected_user:userId,p_request:m.request,p_confirmation:'RESET TRAINING'});if(error)throw error;m={...m,generation:String(data),remoteDone:true};localStorage.setItem(PENDING,JSON.stringify(m));}
 await clearTrainingLocally(()=>assertActive(userId));acceptGeneration(userId,m.generation);localStorage.removeItem(PENDING);return true;
}
