// Immutable revisions avoid a reconnect overwriting an unreviewed second-device draft.
// This queue is private to its owner. Remote revisions require an explicit restore.
export function draftQueueKey(owner){if(!owner)throw Error('sign_in_required');return 'gymak_draft_outbox_v1:'+owner;}
export function readDraftQueue(owner,storage=localStorage){const raw=storage.getItem(draftQueueKey(owner));if(!raw)return [];let x;try{x=JSON.parse(raw);}catch{throw Error('draft_queue_corrupt');}if(!Array.isArray(x))throw Error('draft_queue_corrupt');return x;}
export function queueDraftRevision(owner,kind,entity,payload,storage=localStorage){
 if(!['workout','meal_plan'].includes(kind)||!entity||!payload||typeof payload!=='object'||Array.isArray(payload)||JSON.stringify(payload).length>250000)throw Error('invalid_draft');
 const queue=readDraftQueue(owner,storage),row={id:crypto.randomUUID(),owner,kind,entity,payload:JSON.parse(JSON.stringify(payload)),createdAt:Date.now()};
 queue.push(row);if(queue.length>200)throw Error('draft_queue_full');
 storage.setItem(draftQueueKey(owner),JSON.stringify(queue));return row;
}
export async function flushDraftQueue(owner,client,storage=localStorage,canApply=()=>true){
 const rows=readDraftQueue(owner,storage);if(!rows.length)return {uploaded:0};
 const auth=await client.auth.getUser();if(auth.error||auth.data?.user?.id!==owner)throw Error('session_changed');
 for(const row of rows){if(!canApply())throw Error('session_changed');if(row.owner!==owner)throw Error('draft_owner_changed');const {error}=await client.from('private_draft_revisions').upsert({id:row.id,user_id:owner,kind:row.kind,entity_id:row.entity,payload:row.payload,client_created_at:new Date(row.createdAt).toISOString()},{onConflict:'id',ignoreDuplicates:true});if(error)throw error;}
 if(!canApply())throw Error('session_changed');
 const sent=new Set(rows.map(r=>r.id));const remaining=readDraftQueue(owner,storage).filter(r=>!sent.has(r.id));storage.setItem(draftQueueKey(owner),JSON.stringify(remaining));return {uploaded:rows.length};
}
export async function readRemoteDrafts(owner,client){
 const auth=await client.auth.getUser();if(auth.error||auth.data?.user?.id!==owner)throw Error('session_changed');
 const {data,error}=await client.from('private_draft_revisions').select('id,kind,entity_id,payload,client_created_at,created_at').eq('user_id',owner).order('created_at',{ascending:false}).limit(100);if(error)throw error;return data||[];
}
