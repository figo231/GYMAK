import {describe,it,expect,vi,beforeEach} from 'vitest';
let Store;
beforeEach(async()=>{vi.resetModules();localStorage.clear();Store=(await import('../src/lib/store/gymakStore')).default;});
describe('saved data corruption safety',()=>{
 it('does not replace broken JSON with an empty history',()=>{localStorage.setItem('gymak_state_v1','{broken-history');expect(()=>Store.getProfile()).toThrow('original copy has not been changed');expect(localStorage.getItem('gymak_state_v1')).toBe('{broken-history');});
 it('does not overwrite invalid shapes while migrating',()=>{const raw=JSON.stringify({profile:{name:'Name'},exercises:{not:'an array'}});localStorage.setItem('gymak_state_v1',raw);expect(()=>Store.getProfile()).toThrow();expect(localStorage.getItem('gymak_state_v1')).toBe(raw);});
 it('backfills absent old arrays without losing older identity',()=>{localStorage.setItem('gymak_state_v1',JSON.stringify({profile:{name:'Old'}}));expect(Store.getProfile().name).toBe('Old');expect(Store.getRawStateForSync().weightLogs).toEqual([]);});
});
it('defaults reminders on for old states with no settings without overriding saved off',()=>{localStorage.setItem('gymak_state_v1',JSON.stringify({profile:{name:'Old'}}));expect(Store.getSettings().notifEnabled).toBe(true);Store.setNotifSettings({enabled:false});Store.invalidateCache();expect(Store.getSettings().notifEnabled).toBe(false);});
