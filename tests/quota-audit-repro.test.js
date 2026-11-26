import {describe,it,expect,vi,afterEach} from 'vitest';
import {saveMeasure,replaceMeasure,loadMeasures} from '../src/lib/measure/measure';
import {addWater,getWater,setWaterTotal,setWaterGoal} from '../src/lib/water/water';
afterEach(()=>{vi.restoreAllMocks();localStorage.clear();});
describe('storage failure must not claim success',()=>{
 it('rejects measurement save and atomic date replacement while preserving old row',()=>{
  localStorage.setItem('gymak_measure_v1',JSON.stringify([{date:'2026-11-24',waist:90,chest:100}]));
  vi.spyOn(Storage.prototype,'setItem').mockImplementation(()=>{throw new DOMException('quota','QuotaExceededError');});
  expect(()=>saveMeasure({waist:88},'2026-11-25')).toThrow();expect(()=>replaceMeasure({waist:88},'2026-11-25','2026-11-24')).toThrow();
  expect(loadMeasures()).toEqual([{date:'2026-11-24',waist:90,chest:100}]);
 });
 it('rejects water writes and preserves persisted total and goal',()=>{
  localStorage.setItem('gymak_water_v1',JSON.stringify({goal:2500,days:{'2026-11-25':500}}));
  vi.spyOn(Storage.prototype,'setItem').mockImplementation(()=>{throw new DOMException('quota','QuotaExceededError');});
  expect(()=>addWater(250,'2026-11-25')).toThrow();expect(()=>setWaterTotal(1000,'2026-11-25')).toThrow();expect(()=>setWaterGoal(3000)).toThrow();expect(getWater('2026-11-25')).toEqual({ml:500,goal:2500});
 });
 it('atomically moves date and clears removed fields when persistence works',()=>{
  saveMeasure({waist:90,chest:100},'2026-11-24');replaceMeasure({waist:88},'2026-11-25','2026-11-24');expect(loadMeasures()).toEqual([{date:'2026-11-25',waist:88}]);
 });
});
