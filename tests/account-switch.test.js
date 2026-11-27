import {beforeEach,it,expect} from 'vitest';
import {startFreshForAccount,restoreAccountData,findAccountStash} from '../src/lib/accountSwitch';
import {dataOwner} from '../src/lib/guestImport';
const snap=()=>{const o={};for(let i=0;i<localStorage.length;i++){const k=localStorage.key(i);o[k]=localStorage.getItem(k);}return o;};
beforeEach(()=>{localStorage.clear();});
function seed(owner,tag){localStorage.setItem('gymak_local_data_owner_v1',owner);localStorage.setItem('gymak_state_v1',JSON.stringify({tag}));localStorage.setItem('gymak_training_generation_v1:'+owner,'3');}
it('fresh start stashes the old account data, binds the new owner and leaves device/push keys alone',()=>{
 seed('old','A');localStorage.setItem('gymak_device_id','dev');localStorage.setItem('gymak_push_token','tok');
 startFreshForAccount('new');
 expect(dataOwner()).toBe('new');expect(localStorage.getItem('gymak_state_v1')).toBeNull();expect(localStorage.getItem('gymak_training_generation_v1:old')).toBeNull();
 expect(localStorage.getItem('gymak_device_id')).toBe('dev');expect(localStorage.getItem('gymak_push_token')).toBe('tok');
 const s=findAccountStash('old');expect(s.data.gymak_state_v1).toBe(JSON.stringify({tag:'A'}));expect(s.data['gymak_training_generation_v1:old']).toBe('3');
});
it('restore brings the old account back, stashes the current one, and deletes nothing',()=>{
 seed('old','A');startFreshForAccount('new');localStorage.setItem('gymak_state_v1',JSON.stringify({tag:'B'}));
 expect(restoreAccountData('old')).toBe(true);
 expect(dataOwner()).toBe('old');expect(localStorage.getItem('gymak_state_v1')).toBe(JSON.stringify({tag:'A'}));
 expect(findAccountStash('new').data.gymak_state_v1).toBe(JSON.stringify({tag:'B'}));
 expect(findAccountStash('old')).toBeTruthy();
 expect(restoreAccountData('new')).toBe(true);expect(localStorage.getItem('gymak_state_v1')).toBe(JSON.stringify({tag:'B'}));expect(dataOwner()).toBe('new');
 expect(restoreAccountData('old')).toBe(true);expect(localStorage.getItem('gymak_state_v1')).toBe(JSON.stringify({tag:'A'}));
});
it('repeated switching never loses a stash and stashes do not nest',()=>{
 seed('old','A');startFreshForAccount('new');restoreAccountData('old');startFreshForAccount('new');
 const keys=Object.keys(snap()).filter(k=>k.startsWith('gymak_account_stash_v1:'));expect(keys.length).toBeGreaterThanOrEqual(3);
 for(const k of keys)expect(Object.keys(JSON.parse(localStorage.getItem(k)).data).some(x=>x.includes('account_stash'))).toBe(false);
 expect(findAccountStash('old').data.gymak_state_v1).toBe(JSON.stringify({tag:'A'}));
});
it('restore returns false with no stash and changes nothing',()=>{seed('old','A');const b=snap();expect(restoreAccountData('zzz')).toBe(false);expect(snap()).toEqual(b);});
it('a failed write rolls the previous data back and throws',()=>{
 seed('old','A');const real=Storage.prototype.setItem;let n=0;
 Storage.prototype.setItem=function(k,v){if(k==='gymak_local_data_owner_v1'&&++n>=1&&this===localStorage&&v==='new')throw Error('quota');return real.call(this,k,v);};
 try{expect(()=>startFreshForAccount('new')).toThrow();}finally{Storage.prototype.setItem=real;}
 expect(dataOwner()).toBe('old');expect(localStorage.getItem('gymak_state_v1')).toBe(JSON.stringify({tag:'A'}));
});
it('a stash write failure changes nothing',()=>{
 seed('old','A');const b=snap();const real=Storage.prototype.setItem;
 Storage.prototype.setItem=function(k,v){if(k.startsWith('gymak_account_stash_v1:'))throw Error('quota');return real.call(this,k,v);};
 try{expect(()=>startFreshForAccount('new')).toThrow();}finally{Storage.prototype.setItem=real;}
 expect(snap()).toEqual(b);
});
it('never uses localStorage.clear',()=>{expect(startFreshForAccount.toString()+restoreAccountData.toString()).not.toContain('clear()');});
