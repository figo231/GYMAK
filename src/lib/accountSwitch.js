import {dataOwner} from './guestImport';
import Store from './store/gymakStore';
// Per-account stash of this device's local data. Nothing here ever deletes data:
// before the active data is replaced it is copied to a stash key and read back.
// Stash keys are never removed or overwritten (each one carries its own timestamp).
const OWNER='gymak_local_data_owner_v1',STASH='gymak_account_stash_v1:';
function isActiveKey(k){return !!k&&k.startsWith('gymak_')&&!k.includes('push')&&!k.includes('device')&&!k.includes('guest_import')&&!k.includes('account_stash');}
function activeData(storage){const data={};for(let i=0;i<storage.length;i++){const k=storage.key(i);if(isActiveKey(k))data[k]=storage.getItem(k);}return data;}
function stashKeys(owner,storage){const out=[];for(let i=0;i<storage.length;i++){const k=storage.key(i);if(k?.startsWith(STASH+owner+':'))out.push(k);}return out;}
export function findAccountStash(owner,storage=localStorage){
 let best=null;
 for(const k of stashKeys(owner,storage)){try{const s=JSON.parse(storage.getItem(k));if(s&&s.owner===owner&&s.data&&(!best||s.created>=best.created))best={...s,key:k};}catch{}}
 return best;
}
function writeActive(data,storage){for(const [k,v] of Object.entries(data))storage.setItem(k,v);}
function clearActive(storage){for(const k of Object.keys(activeData(storage)))storage.removeItem(k);}
function stashCurrent(owner,storage){
 const data=activeData(storage);let created=Date.now();let key=STASH+owner+':'+created;
 while(storage.getItem(key)!==null){created+=1;key=STASH+owner+':'+created;}
 const payload=JSON.stringify({owner,created,data});storage.setItem(key,payload);
 if(storage.getItem(key)!==payload){storage.removeItem(key);throw Error('stash_failed');}
 return {key,data};
}
// Replace the active local data with `incoming` (an object of key->value) and bind to `newOwner`.
// The old active data is stashed and verified first; on any failure the old data is put back.
function swap(newOwner,incoming,storage){
 const old=dataOwner(storage);if(!old)throw Error('no_local_owner');
 const before=activeData(storage);
 if(Object.keys(before).length)stashCurrent(old,storage);
 try{
  clearActive(storage);writeActive(incoming,storage);storage.setItem(OWNER,newOwner);
  for(const [k,v] of Object.entries(incoming))if(storage.getItem(k)!==v)throw Error('switch_write_failed');
 }catch(e){
  try{clearActive(storage);writeActive(before,storage);}catch{}
  throw e;
 }
 Store.invalidateCache();
}
// Option B: continue with the new account on a clean slate. The other account's data is kept in its stash.
export function startFreshForAccount(newId,storage=localStorage){swap(newId,{},storage);}
// Restore: the stash for this account goes back to active; the current account's data is stashed first.
export function restoreAccountData(id,storage=localStorage){
 const s=findAccountStash(id,storage);if(!s)return false;
 swap(id,s.data,storage);return true;
}
