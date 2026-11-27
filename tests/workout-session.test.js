import {beforeEach,describe,it,expect,vi} from 'vitest';
import {createWorkoutSession,nextWorkoutSet,workoutSummary,finishWorkoutSession} from '../src/lib/workoutSession';
const make=()=>createWorkoutSession({id:'session',owner:'owner',title:'Push',exercises:[{id:'a',sets:2,reps:10},{id:'b',sets:1,reps:8}],now:1000});
describe('workout state',()=>{
 it('saves a set immutably and moves only when its exercise is complete',()=>{const s=make();const a=nextWorkoutSet(s,{exerciseId:'a',requestId:'one',weight:30,reps:10,now:2000});expect(s.exercises[0].completed).toHaveLength(0);expect(a.session.cursor).toBe(0);const b=nextWorkoutSet(a.session,{exerciseId:'a',requestId:'two',weight:30,reps:10,now:3000});expect(b.session.cursor).toBe(1);expect(workoutSummary(b.session).sets).toBe(2);});
 it('deduplicates exact retries but rejects changed retries',()=>{const args={exerciseId:'a',requestId:'one',weight:0,reps:10};const a=nextWorkoutSet(make(),args);expect(nextWorkoutSet(a.session,args).duplicate).toBe(true);expect(()=>nextWorkoutSet(a.session,{...args,weight:20})).toThrow('workout_request_changed');});
 it('rejects invalid values and out-of-order logs',()=>{for(const args of [{exerciseId:'b',weight:30,reps:10},{exerciseId:'a',weight:-1,reps:10},{exerciseId:'a',weight:30,reps:1.5}])expect(()=>nextWorkoutSet(make(),{...args,requestId:'one'})).toThrow();});
 it('finishes only nonempty sessions',()=>{expect(()=>finishWorkoutSession(make())).toThrow('workout_empty');const a=nextWorkoutSet(make(),{exerciseId:'a',requestId:'one',weight:30,reps:10});expect(finishWorkoutSession(a.session).status).toBe('completed');});
});
describe('atomic Store session writes',()=>{
 let S;
 beforeEach(async()=>{localStorage.clear();vi.resetModules();S=(await import('../src/lib/store/gymakStore')).default;S.resetAllData();localStorage.setItem('gymak_local_data_owner_v1','owner');});
 const start=()=>S.startWorkoutSession('Workout',[S.getExercises()[0]]);
 it('reload resumes both session and its logged set; retry does not double log',()=>{const s=start(),id=s.exercises[0].id;S.logWorkoutSet(s.id,id,'r1',30,10);S.invalidateCache();expect(S.getWorkoutSession().exercises[0].completed).toHaveLength(1);S.logWorkoutSet(s.id,id,'r1',30,10);expect(S.getExerciseLogs(id)).toHaveLength(1);});
 it('hides and blocks a session from another account',()=>{const s=start();localStorage.setItem('gymak_local_data_owner_v1','other');expect(S.getWorkoutSession()).toBeNull();expect(()=>S.logWorkoutSet(s.id,s.exercises[0].id,'r1',30,10)).toThrow();});
 it('storage failure preserves old session and logs together',()=>{const s=start();const before=localStorage.getItem('gymak_state_v1');const spy=vi.spyOn(Storage.prototype,'setItem').mockImplementation(()=>{throw Error('quota');});expect(()=>S.logWorkoutSet(s.id,s.exercises[0].id,'r1',30,10)).toThrow('workout_save_failed');spy.mockRestore();expect(localStorage.getItem('gymak_state_v1')).toBe(before);expect(S.getWorkoutSession().exercises[0].completed).toHaveLength(0);});
});
it('can leave an empty workout without fabricating completion or deleting logged sets',async()=>{localStorage.clear();vi.resetModules();const S=(await import('../src/lib/store/gymakStore')).default;S.resetAllData();localStorage.setItem('gymak_local_data_owner_v1','owner');let s=S.startWorkoutSession('Workout',[S.getExercises()[0]]);S.cancelEmptyWorkoutSession(s.id);expect(S.getWorkoutSession()).toBeNull();s=S.startWorkoutSession('Workout',[S.getExercises()[0]]);S.logWorkoutSet(s.id,s.exercises[0].id,'r',20,8);expect(()=>S.cancelEmptyWorkoutSession(s.id)).toThrow('workout_has_sets');expect(S.getExerciseLogs(s.exercises[0].id)).toHaveLength(1);});

import { selectWorkoutExercise, nextIncompleteIndex, nextWorkoutSet, createWorkoutSession as _cws } from '../src/lib/workoutSession';
describe('numbered list: pick any exercise', () => {
  const mk = () => _cws({ id: 's', owner: 'o', title: 'D', exercises: [1,2,3].map(n => ({ id: 'e'+n, name: 'E'+n, sets: 1, reps: 10 })) });
  it('moves the pointer without touching logs', () => {
    const s = mk(); const n = selectWorkoutExercise(s, 2);
    expect(n.cursor).toBe(2); expect(n.exercises).toEqual(s.exercises);
  });
  it('rejects bad index and inactive session', () => {
    expect(() => selectWorkoutExercise(mk(), 3)).toThrow(); expect(() => selectWorkoutExercise(mk(), -1)).toThrow();
    expect(() => selectWorkoutExercise({ ...mk(), status: 'completed' }, 1)).toThrow();
  });
  it('after finishing, goes to the next unfinished one, wrapping back', () => {
    let s = selectWorkoutExercise(mk(), 2);
    s = nextWorkoutSet(s, { exerciseId: 'e3', requestId: 'r1', weight: 10, reps: 10 }).session;
    expect(s.cursor).toBe(0);
    s = nextWorkoutSet(s, { exerciseId: 'e1', requestId: 'r2', weight: 10, reps: 10 }).session;
    expect(s.cursor).toBe(1);
    expect(nextIncompleteIndex(s.exercises, 1)).toBe(-1);
  });
  it('top to bottom use is unchanged', () => {
    let s = mk();
    s = nextWorkoutSet(s, { exerciseId: 'e1', requestId: 'a', weight: 1, reps: 1 }).session;
    expect(s.cursor).toBe(1);
  });
});
