import {readMutableJournal,saveMutableJournal} from './mutableRows';
// Review records contain only this account's saved values. A choice establishes
// a baseline for the next CAS; it is not an unconditional overwrite.
export function mutableConflicts(owner,storage=localStorage){return Object.entries(readMutableJournal(owner,storage).conflicts).filter(([,r])=>!r.resolvedAt).map(([id,r])=>({id,...r}));}
export function chooseMutableConflict(owner,id,reviewFingerprint,choice,storage=localStorage){
 if(!['local','remote'].includes(choice))throw Error('invalid_sync_choice');
 const journal=readMutableJournal(owner,storage),conflict=journal.conflicts[id];
 if(!conflict||conflict.resolvedAt||conflict.fingerprint!==reviewFingerprint)throw Error('sync_review_changed');
 // Local choice: explicitly accept overwriting precisely the reviewed cloud
 // value, subject to another atomic server version check at the next sync.
 // Remote choice is consumed by the domain adapter after it checks live values.
 journal.conflicts[id]={...conflict,choice,chosenAt:Date.now()};
 saveMutableJournal(owner,journal,storage);
}
