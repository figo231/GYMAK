import{beforeEach,it,expect}from'vitest';import Store from '../src/lib/store/gymakStore';
beforeEach(()=>{localStorage.clear();Store.invalidateCache();});
const row={id:'one',first:'bench-press-barbell',second:'lat-pulldown',rounds:3,rest:90};
it('persists linked exercises without writing workout logs',()=>{Store.saveSuperset(row);Store.invalidateCache();expect(Store.getSupersets()).toEqual([row]);expect(Store.getExerciseLogs(row.first)).toEqual([]);Store.deleteSuperset('one');expect(Store.getSupersets()).toEqual([]);});
it('rejects same/missing exercise and invalid round/rest values',()=>{for(const x of [{second:row.first},{first:'missing'},{rounds:0},{rounds:1.5},{rest:0},{rest:301}])expect(()=>Store.saveSuperset({...row,...x})).toThrow();});

it('training reset clears the new local fitness fields',()=>{Store.saveSuperset(row);Store.saveWeeklyCheckIn({date:'2026-11-24',week:'2026-11-21',sleep:8,energy:3,hunger:3,adherence:80,note:''});Store.resetTrainingData();expect(Store.getSupersets()).toEqual([]);expect(Store.getWeeklyCheckIns()).toEqual([]);});
