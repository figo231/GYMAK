import {beforeEach,it,expect,vi} from 'vitest';
import {archiveGuestData,markGuestData,hasGuestImport,findGuestConflicts,finishGuestImport} from '../src/lib/guestImport';
import Store from '../src/lib/store/gymakStore';
beforeEach(()=>{localStorage.clear();Store.invalidateCache();Store.resetAllData();});
it('keeps the complete legacy24/25 local state and snapshots before importing',()=>{for(const version of[24,25]){Store.setProfileName('Legacy '+version);const original=localStorage.getItem('gymak_state_v1');markGuestData();expect(hasGuestImport()).toBe(true);const a=archiveGuestData('user'+version);expect(a.data.gymak_state_v1).toBe(original);expect(localStorage.getItem('gymak_state_v1')).toBe(original);}});
it('finds date and custom exercise collisions, not non-conflicting records',()=>{const state={weightLogs:[{date:'2026-11-20',weight:75}],foodLog:[{date:'2026-11-20',items:[{id:'one'}]}],exercises:[{id:'custom',custom:true,name:'A',muscle:'legs',sets:3,reps:12}]};const remote={weights:[{date:'2026-11-20',weight:80},{date:'2026-11-21',weight:81}],food:[{date:'2026-11-20',items:[{id:'two'}]}],exercises:[{id:'custom',name:'B',muscle:'legs',sets:3,reps:12}]};expect(findGuestConflicts(state,remote).map(x=>x.type)).toEqual(['weight','food','exercise']);});
it('does not remove pending import or mutate local data when identity changes',async()=>{markGuestData();const before=localStorage.getItem('gymak_state_v1');const client={auth:{getUser:vi.fn().mockResolvedValue({data:{user:{id:'different'}}})}};await expect(finishGuestImport({userId:'user',conflicts:[]},{},client)).rejects.toThrow('session_changed');expect(hasGuestImport()).toBe(true);expect(localStorage.getItem('gymak_state_v1')).toBe(before);});
it('requires a decision for every collision before any write',async()=>{const before=localStorage.getItem('gymak_state_v1');const c={auth:{getUser:async()=>({data:{user:{id:'user'}}})}};await expect(finishGuestImport({userId:'user',conflicts:[{key:'weight:x'}]},{},c)).rejects.toThrow('conflict_choice_required');expect(localStorage.getItem('gymak_state_v1')).toBe(before);});
it('guest import code never deletes IndexedDB media or clears local storage',()=>{expect(finishGuestImport.toString()).not.toContain('deleteDatabase');expect(finishGuestImport.toString()).not.toContain('localStorage.clear');});

function clientFor(remote,options={}){
 return {auth:{getUser:async()=>({data:{user:{id:options.user||'user'}}})},rpc:async()=>options.failGeneration?{error:Error('network')}:{data:2},from(table){const q={select(){return q;},eq(){return q;},maybeSingle:async()=>({data:remote.profile||null}),then(resolve){resolve({data:remote[{weight_logs:'weights',food_log:'food',exercises:'exercises'}[table]]||[]});}};return q;}};
}
it('does not reclassify signed-out account history as guest data',async()=>{
 const {bindDataOwner}=await import('../src/lib/guestImport');bindDataOwner('first');markGuestData();expect(hasGuestImport()).toBe(false);
 const {inspectGuestImport}=await import('../src/lib/guestImport');await expect(inspectGuestImport('other',clientFor({}))).rejects.toThrow('different_local_account');
});
it('recognizes old sync ownership before any new import',async()=>{
 localStorage.setItem('gymak_sync_state_v1',JSON.stringify({migratedUserIds:['old']}));markGuestData();expect(hasGuestImport()).toBe(false);
 const {dataOwner}=await import('../src/lib/guestImport');expect(dataOwner()).toBe('old');
});
it('merges nonconflicting records and honors both conflict choices',async()=>{
 const {inspectGuestImport,dataOwner}=await import('../src/lib/guestImport');
 const s=Store.getRawStateForSync();s.weightLogs=[{date:'2026-11-20',weight:75,bodyFat:null},{date:'2026-11-19',weight:74,bodyFat:null}];localStorage.setItem('gymak_state_v1',JSON.stringify(s));Store.invalidateCache();markGuestData();
 const remote={weights:[{date:'2026-11-20',weight:80,body_fat:null},{date:'2026-11-21',weight:81,body_fat:null}],food:[],exercises:[]};const c=clientFor(remote);const review=await inspectGuestImport('user',c);await finishGuestImport(review,{'weight:2026-11-20':'local'},c);
 expect(Store.getRawStateForSync().weightLogs.map(x=>x.weight)).toEqual([74,75,81]);expect(hasGuestImport()).toBe(false);expect(dataOwner()).toBe('user');expect(JSON.parse(localStorage.getItem('gymak_guest_import_archive_v1:user')).data.gymak_state_v1).toContain('75');
});
it('applies chosen account version and retains original backup',async()=>{
 const {inspectGuestImport}=await import('../src/lib/guestImport');const s=Store.getRawStateForSync();s.weightLogs=[{date:'2026-11-20',weight:75}];localStorage.setItem('gymak_state_v1',JSON.stringify(s));Store.invalidateCache();markGuestData();const c=clientFor({weights:[{date:'2026-11-20',weight:80}]});const review=await inspectGuestImport('user',c);await finishGuestImport(review,{'weight:2026-11-20':'remote'},c);expect(Store.getRawStateForSync().weightLogs[0].weight).toBe(80);expect(localStorage.getItem('gymak_guest_import_archive_v1:user')).toContain('75');
});
it('leaves pending import and original state on an offline failure, then retries',async()=>{
 const {inspectGuestImport}=await import('../src/lib/guestImport');markGuestData();const initial=localStorage.getItem('gymak_state_v1');const remote={weights:[],food:[],exercises:[]};const review=await inspectGuestImport('user',clientFor(remote));await expect(finishGuestImport(review,{},clientFor(remote,{failGeneration:true}))).rejects.toThrow('network');expect(hasGuestImport()).toBe(true);expect(localStorage.getItem('gymak_state_v1')).toBe(initial);await finishGuestImport(review,{},clientFor(remote));expect(hasGuestImport()).toBe(false);
});
it('forces a new review when account rows changed after preview',async()=>{
 const {inspectGuestImport}=await import('../src/lib/guestImport');markGuestData();const review=await inspectGuestImport('user',clientFor({}));const before=localStorage.getItem('gymak_state_v1');await expect(finishGuestImport(review,{},clientFor({weights:[{date:'2026-11-20',weight:80}]}))).rejects.toThrow('guest_remote_changed');expect(localStorage.getItem('gymak_state_v1')).toBe(before);expect(hasGuestImport()).toBe(true);
});
it('detects secondary muscle and food total conflicts, not only labels',()=>{
 const local={weightLogs:[],foodLog:[{date:'2026-11-20',items:[],totalKcal:20}],exercises:[{custom:true,id:'x',name:'X',muscle:'legs',sets:3,reps:12,secondary:'core'}]};const remote={food:[{date:'2026-11-20',items:[],total_kcal:40}],exercises:[{id:'x',name:'X',muscle:'legs',sets:3,reps:12,secondary:'back'}]};expect(findGuestConflicts(local,remote).map(x=>x.type)).toEqual(['food','exercise']);
});
