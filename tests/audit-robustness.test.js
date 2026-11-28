import{beforeEach,describe,it,expect,vi}from'vitest';
import{fmtClock}from'../src/lib/rest/restTimer';
import{fmt}from'../src/lib/format';
import{bmiCategory,buildCsv}from'../src/lib/profileLogic';
import{shiftISO}from'../src/lib/dateKey';
import{relDayAr,parseWeightForm}from'../src/lib/homeLogic';
let Store;
beforeEach(async()=>{vi.resetModules();localStorage.clear();Store=(await import('../src/lib/store/gymakStore')).default;});
describe('bad values never show NaN or crash',()=>{
 it('fmtClock, fmt, bmiCategory, shiftISO, relDayAr',()=>{
  expect(fmtClock(NaN)).toBe('0:00');expect(fmtClock('abc')).toBe('0:00');expect(fmtClock(75)).toBe('1:15');
  expect(fmt('abc')).toBe('0');expect(fmt(undefined)).toBe('0');expect(fmt(1234.56)).toBe('1,234.6');
  expect(bmiCategory(NaN)).toBe('');expect(bmiCategory(0)).toBe('');expect(bmiCategory(22)).not.toBe('');
  expect(()=>shiftISO('garbage',1)).not.toThrow();expect(shiftISO('2026-11-28',1)).toBe('2026-11-29');
  expect(relDayAr('garbage','2026-11-28')).toBe('');expect(relDayAr('2026-12-05','2026-11-28')).toBe('');
  expect(relDayAr('2026-11-28','2026-11-28')).not.toBe('');
 });
 it('weight form names a bad date as a bad date',()=>{
  const r=parseWeightForm({weight:'80',date:'garbage'},x=>x,'2026-11-28');
  expect(r.ok).toBe(false);expect(r.error).not.toMatch(/ماجاش/);
  expect(parseWeightForm({weight:'80',date:'2026-12-30'},x=>x,'2026-11-28').error).toMatch(/ماجاش/);
 });
 it('csv uses exercise names when given',()=>{
  const st={exerciseLogs:{bench:[{date:'2026-01-01',weight:60,sets:3,reps:8}]}};
  expect(buildCsv(st)).toContain('bench');
  expect(buildCsv(st,()=>'Bench Press')).toContain('Bench Press');
 });
});
describe('store validates what it stores',()=>{
 it('logSet rejects impossible sets',()=>{
  const id=Store.getExercises()[0].id;
  for(const [w,s,r] of [[-5,1,1],['abc',1,1],[50,0,0],[50,2.5,8],[1e9,1,1],[50,1e6,1],[50,1,1e9]])expect(()=>Store.logSet(id,w,s,r),JSON.stringify([w,s,r])).toThrow();
  expect(Store.getExerciseLogs(id).length).toBe(0);
  Store.logSet(id,0,1,12);Store.logSet(id,60,3,8);
  expect(Store.getExerciseLogs(id).length).toBe(2);
 });
 it('grams edit has an upper cap and addExercise needs a name',()=>{
  Store.logFoodEntries(Store.parseFood('200 جم رز'));
  const d=new Date();const day=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  expect(Store.updateFoodItemGrams(day,0,1e9)).toBeNull();
  expect(Store.updateFoodItemGrams(day,0,'1e400')).toBeNull();
  expect(Store.updateFoodItemGrams(day,0,250)).not.toBeNull();
  expect(Store.addExercise({name:'  ',muscle:'chest',sets:3,reps:10})).toBeNull();
  expect(Store.addExercise({name:'My move',muscle:'chest',sets:3,reps:10})).not.toBeNull();
 });
});
describe('english exercise names',()=>{
 it('every built-in exercise has one',async()=>{
  const {getExerciseEnglish}=await import('../src/lib/exerciseImages');
  const missing=Store.getExercises().filter(e=>!getExerciseEnglish(e.id)).map(e=>e.id);
  expect(missing).toEqual([]);
 });
});
