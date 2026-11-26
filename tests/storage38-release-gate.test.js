import {it,expect,vi,afterEach} from 'vitest';
import {saveMeasure,replaceMeasure,loadMeasures} from '../src/lib/measure/measure';
import {getWater,addWater,setWaterTotal,setWaterGoal} from '../src/lib/water/water';
import {exportPayload,parseBackup,applyBackup} from '../src/lib/profileLogic';
afterEach(()=>{vi.restoreAllMocks();localStorage.clear()});
it('saves and edits measurement and water locally when connection is unavailable',()=>{
 vi.stubGlobal('fetch',vi.fn(()=>Promise.reject(Error('offline'))));
 saveMeasure({waist:90,chest:100},'2026-11-23');saveMeasure({arm:35},'2026-11-24');
 replaceMeasure({waist:88},'2026-11-25','2026-11-23');expect(loadMeasures()).toEqual([{arm:35,date:'2026-11-24'},{waist:88,date:'2026-11-25'}]);
 addWater(250,'2026-11-25');setWaterTotal(750,'2026-11-25');setWaterGoal(3000);expect(getWater('2026-11-25')).toEqual({ml:750,goal:3000});expect(fetch).not.toHaveBeenCalled();vi.unstubAllGlobals();
});
it('rejected date replacement leaves both unrelated rows and original date byte-identical',()=>{
 const old=JSON.stringify([{date:'2026-11-23',waist:90,chest:100},{date:'2026-11-24',arm:35}]);localStorage.setItem('gymak_measure_v1',old);
 const real=Storage.prototype.setItem;vi.spyOn(Storage.prototype,'setItem').mockImplementation(function(k,v){if(k==='gymak_measure_v1')throw new DOMException('quota','QuotaExceededError');return real.call(this,k,v)});
 expect(()=>replaceMeasure({waist:88},'2026-11-25','2026-11-23')).toThrow();expect(localStorage.getItem('gymak_measure_v1')).toBe(old);
});
it('a valid exported backup restores measurement and water byte values to isolated storage',()=>{
 const state={profile:{},weightLogs:[],exerciseLogs:{},workoutDays:[]};localStorage.setItem('gymak_state_v1',JSON.stringify(state));saveMeasure({waist:90},'2026-11-24');setWaterTotal(500,'2026-11-25');setWaterGoal(2500);
 const snapshot=JSON.stringify(exportPayload());const parsed=parseBackup(snapshot);expect(parsed.ok).toBe(true);const m=new Map(),storage={getItem:k=>m.get(k)??null,setItem:(k,v)=>m.set(k,v),removeItem:k=>m.delete(k)};applyBackup(parsed.payload,storage);
 for(const k of ['gymak_state_v1','gymak_measure_v1','gymak_water_v1'])expect(m.get(k)).toBe(localStorage.getItem(k));expect(m.has('gymak_before_import_v1')).toBe(true);
});

it('does not overwrite an existing destination when moving a measurement date',()=>{saveMeasure({waist:90},'2026-11-23');saveMeasure({waist:85,arm:35},'2026-11-24');const old=localStorage.getItem('gymak_measure_v1');expect(()=>replaceMeasure({waist:88},'2026-11-24','2026-11-23')).toThrow('measurement_date_exists');expect(localStorage.getItem('gymak_measure_v1')).toBe(old);});
