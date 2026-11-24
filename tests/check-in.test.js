import { describe,it,expect,beforeEach } from 'vitest';
import {weekStart,normalizeCheckIn,checkInText} from '../src/lib/checkIn';
import Store from '../src/lib/store/gymakStore';
const form={sleep:7.5,energy:4,hunger:2,adherence:80,note:'  أسبوع كويس  '};
beforeEach(()=>{localStorage.clear();Store.invalidateCache();});
describe('weekly check-in',()=>{
 it('uses Saturday-local week keys across year boundaries',()=>{expect(weekStart('2026-11-24')).toBe('2026-11-21');expect(weekStart('2027-01-01')).toBe('2026-12-26');expect(weekStart('2026-11-21')).toBe('2026-11-21');});
 it('validates finite values and never silently fills missing sleep',()=>{for(const sleep of ['',null,-1,25,Infinity,'bad'])expect(()=>normalizeCheckIn({...form,sleep})).toThrow();expect(()=>normalizeCheckIn({...form,energy:6})).toThrow();expect(()=>normalizeCheckIn({...form,energy:1.5})).toThrow();expect(()=>normalizeCheckIn({...form,adherence:101})).toThrow();});
 it('stores only one summary per week and preserves other state',()=>{const before=Store.getProfile();Store.saveWeeklyCheckIn(normalizeCheckIn(form,'2026-11-24'));Store.saveWeeklyCheckIn(normalizeCheckIn({...form,sleep:8},'2026-11-25'));expect(Store.getWeeklyCheckIns()).toHaveLength(1);expect(Store.getWeeklyCheckIns()[0].sleep).toBe(8);expect(Store.getProfile()).toEqual(before);expect(JSON.parse(localStorage.getItem('gymak_state_v1')).weeklyCheckIns).toHaveLength(1);});
 it('deletes locally and formats an explicit draft',()=>{const r=normalizeCheckIn(form,'2026-11-24');Store.saveWeeklyCheckIn(r);expect(checkInText(r)).toContain('7.5');expect(r.note).toBe('أسبوع كويس');Store.deleteWeeklyCheckIn(r.week);expect(Store.getWeeklyCheckIns()).toEqual([]);});
});
