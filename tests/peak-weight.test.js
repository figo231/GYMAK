import { beforeEach, describe, expect, it, vi } from 'vitest';
import { localISO, shiftISO } from '../src/lib/dateKey';
import { fmtLoggedWeight } from '../src/lib/stats/format';
import { buildWeekly, weeklyCardData } from '../src/lib/stats/weekly';
let store;
async function seed(logs) { const raw=JSON.parse(localStorage.getItem('gymak_state_v1'));raw.exerciseLogs=logs;raw.weightLogs=[{date:localISO(),weight:200}];localStorage.setItem('gymak_state_v1',JSON.stringify(raw));vi.resetModules();store=(await import('../src/lib/store/gymakStore')).default; }
beforeEach(async()=>{localStorage.clear();vi.resetModules();store=(await import('../src/lib/store/gymakStore')).default;store.resetAllData();});
describe('actual heaviest logged weight, never accumulated volume',()=>{
 it('returns 50 kg, not weight times repetitions or sets, and ignores body weight',async()=>{const id=store.getExercises().find(e=>e.unit!=='sec').id;await seed({[id]:[{date:localISO(),weight:40,sets:4,reps:16},{date:localISO(),weight:50,sets:2,reps:5}]});expect(store.getPeakWeight(7)).toBe(50);expect(store.getTonnage(7)).toBe(3060);const w=buildWeekly(store);expect(w.peakWeight).toBe(50);expect(weeklyCardData({...w,empty:false}).sub).toContain('أعلى وزن: 50 كجم');expect(weeklyCardData({...w,empty:false}).sub).not.toContain('3,060');});
 it('respects a local inclusive seven-day window and excludes future logs',async()=>{const id=store.getExercises().find(e=>e.unit!=='sec').id,t=localISO();await seed({[id]:[{date:shiftISO(t,-6),weight:50,sets:1,reps:1},{date:shiftISO(t,-7),weight:90,sets:1,reps:1},{date:shiftISO(t,1),weight:500,sets:1,reps:1}]});expect(store.getPeakWeight(7)).toBe(50);expect(store.getPeakWeight(8)).toBe(90);});
 it('ignores timed, invalid, negative and incomplete sets',async()=>{const id=store.getExercises().find(e=>e.unit!=='sec').id;await seed({plank:[{date:localISO(),weight:900,sets:3,reps:60}],[id]:[...[-1,null,'', 'NaN'].map(weight=>({date:localISO(),weight,sets:1,reps:1})),{date:localISO(),weight:500,sets:0,reps:10},{date:localISO(),weight:400,sets:3,reps:0},{date:localISO(),weight:42.5,sets:3,reps:8}]});expect(store.getPeakWeight(7)).toBe(42.5);});
 it('distinguishes no logged weight from a real zero-added-weight set',async()=>{expect(store.getPeakWeight(7)).toBeNull();const id=store.getExercises().find(e=>e.unit!=='sec').id;await seed({[id]:[{date:localISO(),weight:0,sets:3,reps:10}]});expect(store.getPeakWeight(7)).toBe(0);});
 it('formats units without switching a single lift into tons',()=>{expect(fmtLoggedWeight(null)).toBe('—');expect(fmtLoggedWeight(42.5)).toBe('42.5 كجم');expect(fmtLoggedWeight(110.23,'lb')).toBe('110.2 lb');expect(fmtLoggedWeight(10000)).toBe('10,000 كجم');});
});
