// Compare semantic fields, never device clocks. Unknown baselines do not grant
// permission to overwrite an existing remote row.
export function stableValue(value){
 if(Array.isArray(value))return value.map(stableValue);
 if(value&&typeof value==='object')return Object.fromEntries(Object.keys(value).sort().map(k=>[k,stableValue(value[k])]));
 return value;
}
export const rowFingerprint=value=>JSON.stringify(stableValue(value??null));
export function planMutableRow({baseline,local,remote,hasBaseline=false,deleted=false}){
 const same=(a,b)=>rowFingerprint(a)===rowFingerprint(b);
 if(deleted){
  if(remote===null)return {action:'ack_delete'};
  if(!hasBaseline||!same(remote,baseline))return {action:'conflict',reason:'remote_changed_before_delete'};
  return {action:'delete'};
 }
 if(local===null)return {action:remote===null?'none':'pull'};
 if(same(local,remote))return {action:'ack'};
 if(!hasBaseline)return remote===null?{action:'insert'}:{action:'conflict',reason:'unknown_legacy_baseline'};
 const localChanged=!same(local,baseline),remoteChanged=!same(remote,baseline);
 if(!localChanged)return {action:'pull'};
 if(remoteChanged)return {action:'conflict',reason:'both_changed'};
 return {action:'update'};
}
const key=owner=>{if(!owner)throw Error('sign_in_required');return 'gymak_mutable_sync_v1:'+owner;};
export function readMutableJournal(owner,storage=localStorage){
 const raw=storage.getItem(key(owner));if(!raw)return {schema:1,rows:{},conflicts:{}};
 let x;try{x=JSON.parse(raw);}catch{throw Error('sync_journal_corrupt');}
 if(x?.schema!==1||!x.rows||Array.isArray(x.rows)||typeof x.rows!=='object'||!x.conflicts||typeof x.conflicts!=='object'||Array.isArray(x.conflicts))throw Error('sync_journal_corrupt');return x;
}
export function saveMutableJournal(owner,journal,storage=localStorage){storage.setItem(key(owner),JSON.stringify(journal));}
export function preserveMutableConflict(owner,id,{baseline,local,remote,reason},storage=localStorage){
 const journal=readMutableJournal(owner,storage),fingerprint=rowFingerprint({baseline,local,remote});
 if(journal.conflicts[id]?.fingerprint===fingerprint)return;
 const existing=journal.conflicts[id];
 // Keep all divergent local revisions until the user resolves them.
 const revisions=existing?.revisions||[];
 if(!revisions.some(r=>rowFingerprint(r.local)===rowFingerprint(local)))revisions.push({local,at:Date.now()});
 journal.conflicts[id]={baseline,local,remote,reason,fingerprint,revisions};saveMutableJournal(owner,journal,storage);
}
// One row at a time so both the captured local edit and server version are
// explicit. Network failures never advance the acknowledged baseline.
export async function reconcileMutableRow({owner,table,key:rowKey,local,remote,semantic,deleted=false,client,storage=localStorage,canApply=()=>true,applyRemote}){
 const id=table+':'+rowKey,journal=readMutableJournal(owner,storage),record=journal.rows[id];
 const localValue=deleted?null:semantic(local),remoteValue=remote===null?null:semantic(remote);
 const review=journal.conflicts[id];
 const reviewed=review&&!review.resolvedAt&&rowFingerprint(review.local)===rowFingerprint(localValue)&&rowFingerprint(review.remote)===rowFingerprint(remoteValue);
 const plan=reviewed&&review.choice==='remote'?{action:'pull'}:planMutableRow({baseline:reviewed&&review.choice==='local'?remoteValue:record?.value,local:localValue,remote:remoteValue,hasBaseline:!!record||(reviewed&&review.choice==='local'),deleted});
 const conflict=(value,reason)=>{preserveMutableConflict(owner,id,{baseline:record?.value,local:localValue,remote:value,reason},storage);return {action:'conflict',id};};
 if(plan.action==='conflict')return conflict(remoteValue,plan.reason);
 if(!canApply())throw Error('session_changed');
 let accepted=remote;
 if(['update','insert','delete'].includes(plan.action)){
  const {data,error}=await client.rpc('sync_mutable_row_v1',{p_table:table,p_key:rowKey,p_expected:remote,p_data:deleted?null:local,p_delete:deleted});
  if(error)throw error;if(!data||typeof data.ok!=='boolean')throw Error('invalid_sync_response');
  if(!data.ok)return conflict(data.remote===null?null:semantic(data.remote),'remote_changed_during_write');
  accepted=data.remote;
 }
 if(!canApply())throw Error('session_changed');
 // Caller must compare its current local row with the captured one and commit
 // the remote row synchronously, or return false if the user edited meanwhile.
 const applied=applyRemote(accepted,local);
 if(applied===false)return {action:'local_changed',id};
 const latest=readMutableJournal(owner,storage);
 latest.rows[id]={value:accepted===null?null:semantic(accepted),remote:accepted};
 if(latest.conflicts[id])latest.conflicts[id]={...latest.conflicts[id],resolvedAt:Date.now()};saveMutableJournal(owner,latest,storage);
 return {action:plan.action,id,remote:accepted};
}
