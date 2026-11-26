import {describe,it,expect,vi} from 'vitest';
import {hasActiveWorkout} from '../src/lib/update/workoutUpdateGuard';
vi.mock('workbox-window',()=>({Workbox:vi.fn()}));
import {pwaUpdateStrategy} from '../src/lib/update/pwaUpdateStrategy';
describe('workout update safety',()=>{
 it('defers for saved active workouts, including another tab',()=>{
  localStorage.setItem('gymak_state_v1',JSON.stringify({workoutSession:{status:'active'}}));
  expect(hasActiveWorkout()).toBe(true);expect(pwaUpdateStrategy.applyUpdate()).toBe(false);
  localStorage.setItem('gymak_state_v1',JSON.stringify({workoutSession:{status:'completed'}}));expect(hasActiveWorkout()).toBe(false);localStorage.clear();
 });
 it('is conservative when storage cannot be read',()=>{expect(hasActiveWorkout({getItem(){throw Error('blocked');}})).toBe(true);expect(hasActiveWorkout({getItem:()=>'{bad'})).toBe(true);});
 it('allows ordinary updates without a session',()=>{expect(hasActiveWorkout({getItem:()=>null})).toBe(false);});
});
