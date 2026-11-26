import {describe,it,expect,beforeEach} from 'vitest';
import {applyBackup,parseBackup} from '../src/lib/profileLogic';
import {validateBackup,restoreText} from '../src/lib/backup';
const state={profile:{},weightLogs:[{date:'2026-01-01',weight:80}],exerciseLogs:{},workoutDays:[]};
beforeEach(()=>localStorage.clear());
describe('backup replacement safety',()=>{
 it('rejects malformed nested collection shapes in either import format',()=>{for(const patch of [{exercises:{}},{exerciseLogs:{x:{}}},{settings:[]},{foodLog:{}}]){const bad={...state,...patch};expect(validateBackup(JSON.stringify(bad)).ok).toBe(false);expect(parseBackup(JSON.stringify({app:'GYMAK',state:bad})).ok).toBe(false);}});
 it('does not replace meaningful history when the promised safety snapshot fails',async()=>{localStorage.setItem('gymak_state_v1',JSON.stringify(state));const result=await restoreText(JSON.stringify({...state,profile:{name:'Other'}}));expect(result.ok).toBe(false);expect(localStorage.getItem('gymak_state_v1')).toBe(JSON.stringify(state));});
 it('rolls back earlier keys when multi-key import hits quota and retains recovery copy',()=>{const data=new Map([['gymak_state_v1',JSON.stringify(state)],['gymak_measure_v1','[1]']]);let fail=true;const storage={getItem:k=>data.get(k)??null,removeItem:k=>data.delete(k),setItem(k,v){if(k==='gymak_measure_v1'&&fail){fail=false;throw Error('quota');}data.set(k,v);}};expect(()=>applyBackup({state:{...state,profile:{name:'New'}},measurements:[2]},storage)).toThrow('quota');expect(JSON.parse(data.get('gymak_state_v1')).profile).toEqual({});expect(data.get('gymak_measure_v1')).toBe('[1]');expect(data.has('gymak_before_import_v1')).toBe(true);});
});
it('rejects null log rows and malformed pending-deletion queues before import',()=>{for(const patch of [{weightLogs:[null]},{foodLog:[{items:[null]}]},{exerciseLogs:{x:[null]}},{pendingDeletes:{weight:'wrong'}}])expect(validateBackup(JSON.stringify({...state,...patch})).ok).toBe(false);});
