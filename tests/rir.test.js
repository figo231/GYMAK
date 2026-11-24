import{beforeEach,it,expect}from'vitest';import Store from '../src/lib/store/gymakStore';
beforeEach(()=>{localStorage.clear();Store.invalidateCache();});
it('adds optional effort to one set without changing older log shape',()=>{Store.logSet('bench-press-barbell',40,1,10,2);Store.logSet('bench-press-barbell',40,3,10);const a=Store.getExerciseLogs('bench-press-barbell');expect(a[0].rir).toBe(2);expect(a[1]).not.toHaveProperty('rir');Store.invalidateCache();expect(Store.getExerciseLogs('bench-press-barbell')[0].rir).toBe(2);});
it('never applies a single effort rating to multiple sets',()=>{for(const r of [-1,6,1.5,NaN])expect(()=>Store.logSet('bench-press-barbell',40,1,10,r)).toThrow();expect(()=>Store.logSet('bench-press-barbell',40,3,10,2)).toThrow();});
