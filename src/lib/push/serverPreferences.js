import {supabase} from '../supabaseClient';
const categories=['master','announcement','chat','encouragement'];
const key=id=>'gymak_server_push_pending_v1:'+id;
export function pendingPushPreferences(id,storage=localStorage){try{const p=JSON.parse(storage.getItem(key(id))||'{}');if(!p||typeof p!=='object'||Array.isArray(p))throw Error('push_preferences_corrupt');return p;}catch{throw Error('push_preferences_corrupt');}}
const activeFlushes=new Map();
export async function flushPushPreferences(id,client=supabase,storage=localStorage){
 if(!id||!client)return false;
 const previous=activeFlushes.get(id)||Promise.resolve();
 const run=previous.catch(()=>{}).then(()=>flushCurrent(id,client,storage));
 activeFlushes.set(id,run);
 try{return await run;}finally{if(activeFlushes.get(id)===run)activeFlushes.delete(id);}
}
async function flushCurrent(id,client,storage){
 if(!id||!client)return false;
 const pending=pendingPushPreferences(id,storage);
 if(!Object.keys(pending).length)return true;
 const auth=await client.auth.getUser();if(auth.error||auth.data?.user?.id!==id)throw Error('session_changed');
 for(const [category,enabled] of Object.entries(pending)){
  if(!categories.includes(category)||typeof enabled!=='boolean')throw Error('invalid_push_preference');
  const {error}=await client.from('push_preferences').upsert({user_id:id,category,enabled},{onConflict:'user_id,category'});if(error)throw error;
  const current=pendingPushPreferences(id,storage);if(current[category]===enabled){delete current[category];storage.setItem(key(id),JSON.stringify(current));}
 }
 return true;
}
export async function savePushPreference(id,category,enabled,client=supabase,storage=localStorage){
 if(!id||!categories.includes(category)||typeof enabled!=='boolean')throw Error('invalid_push_preference');
 const p=pendingPushPreferences(id,storage);p[category]=enabled;storage.setItem(key(id),JSON.stringify(p));
 if(!await flushPushPreferences(id,client,storage))throw Error('server_unavailable');
}
export async function readPushPreferences(id,client=supabase){
 if(!client||!id)throw Error('sign_in_required');
 await flushPushPreferences(id,client);
 const auth=await client.auth.getUser();if(auth.error||auth.data?.user?.id!==id)throw Error('session_changed');
 const {data,error}=await client.from('push_preferences').select('category,enabled').eq('user_id',id);if(error)throw error;
 return {...Object.fromEntries(categories.map(k=>[k,true])),...Object.fromEntries((data||[]).filter(p=>categories.includes(p.category)&&typeof p.enabled==='boolean').map(p=>[p.category,p.enabled]))};
}
