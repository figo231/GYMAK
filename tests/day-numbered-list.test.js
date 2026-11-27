import {describe,it,expect} from 'vitest';
import {readFileSync} from 'node:fs';
const day=readFileSync('src/pages/Exercises/DayPlan.jsx','utf8');
const player=readFileSync('src/pages/Workout/WorkoutPlayer.jsx','utf8');
describe('numbered exercise lists',()=>{
 it('day view renders every exercise in one ordered list with numbers',()=>{
  expect(day).toMatch(/<ol className="dp-list dp-list-num"/);
  expect(day).toMatch(/day\.exercises\.map\(\(ex, i\)/);
  expect(day).toMatch(/\{i \+ 1\}/);
  expect(day).not.toMatch(/exg dp-list/);
  expect(day).not.toMatch(/slice\(|\.find\(|\[0\]\s*\}/);
 });
 it('workout player lists all exercises numbered and lets you open any',()=>{
  expect(player).toMatch(/session\.exercises\.map\(\(e,i\)/);
  expect(player).toMatch(/<b>\{i\+1\}<\/b>/);
  expect(player).toMatch(/Store\.selectWorkoutExercise\(session\.id,i\)/);
 });
});
