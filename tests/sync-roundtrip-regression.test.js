import {describe,it,expect,vi,beforeEach} from 'vitest';
const m=vi.hoisted(()=>({rows:[],merge:vi.fn(),upsert:vi.fn()}));
vi.mock('../src/lib/sync/readPages',()=>({readOwnerRows:async()=>m.rows}));
vi.mock('../src/lib/supabaseClient',()=>({supabase:{from:()=>({select:()=>({eq:async()=>({data:m.rows,error:null})}),upsert:m.upsert})}}));
vi.mock('../src/lib/store/gymakStore',()=>({default:{mergeFoodLogFromRemote:m.merge,mergeExerciseLogsFromRemote:m.merge}}));
import {pullFoodLog,pullExerciseLogs} from '../src/lib/sync/domains';
import {validateExerciseLog,validateWorkoutDay} from '../src/lib/sync/validate';
beforeEach(()=>vi.clearAllMocks());
describe('cloud sync regression cases',()=>{
 it('accepts server food totals and sends the valid row to merge',async()=>{m.rows=[{date:'2026-11-25',items:[],total_kcal:450,total_protein:30,total_carbs:60,total_fat:10}];expect(await pullFoodLog('a')).toEqual({dropped:0});expect(m.merge).toHaveBeenCalledWith(m.rows);});
 it('rejects malformed server food totals',async()=>{m.rows=[{date:'2026-11-25',items:[],total_kcal:'450',total_protein:30,total_carbs:60,total_fat:10}];expect(await pullFoodLog('a')).toEqual({dropped:1});expect(m.merge).toHaveBeenCalledWith([]);});
 it('preserves zero external-weight bodyweight sets',async()=>{m.rows=[{exercise_id:'pushup',date:'2026-11-25',weight:0,sets:1,reps:10}];expect(validateExerciseLog(m.rows[0])).toBe(true);expect(await pullExerciseLogs('a')).toEqual({dropped:0});expect(m.merge).toHaveBeenCalledWith(m.rows);expect(validateExerciseLog({...m.rows[0],weight:-1})).toBe(false);});
 it('never applies stale responses after a session generation changes',async()=>{m.rows=[{exercise_id:'pushup',date:'2026-11-25',weight:0,sets:1,reps:10}];await pullExerciseLogs('a',()=>false);await pullFoodLog('a',()=>false);expect(m.merge).not.toHaveBeenCalled();});
 it('rejects impossible dates instead of normalizing into a different day',()=>{expect(validateWorkoutDay('2026-02-30')).toBe(false);expect(validateWorkoutDay('2024-02-29')).toBe(true);expect(validateWorkoutDay('2026-02-29')).toBe(false);});
});
it('validates server body-fat field as well as the local spelling',async()=>{const {validateWeightLog}=await import('../src/lib/sync/validate');expect(validateWeightLog({date:'2026-11-25',weight:80,body_fat:120})).toBe(false);expect(validateWeightLog({date:'2026-11-25',weight:80,body_fat:20})).toBe(true);});
