import {describe,it,expect} from 'vitest';
import {EXERCISE_GUIDES,getExerciseGuide} from '../src/lib/exerciseGuides';
describe('exercise guide presentation',()=>{
 it('has complete Arabic and English sample',()=>{
  for(const entry of Object.values(EXERCISE_GUIDES))for(const lang of ['ar','en']){
   const g=entry[lang];
   for(const field of ['summary','setup','feel','safety'])expect(g[field].length).toBeGreaterThan(25);
   expect(g.steps.length).toBeGreaterThanOrEqual(4);
   expect(g.mistakes.length).toBeGreaterThanOrEqual(2);
  }
 });
 it('does not replace custom exercise writing',()=>{
  expect(getExerciseGuide({id:'bench-press-barbell',custom:true})).toBeNull();
  expect(getExerciseGuide({id:'bench-press-barbell',ownerContent:true})).toBeNull();
  expect(getExerciseGuide(null)).toBeNull();
  expect(getExerciseGuide({id:'unknown'})).toBeNull();
 });
 it('uses requested language without mutating the exercise',()=>{
  const ex={id:'bench-press-barbell',custom:false,instructions:['saved']};
  expect(getExerciseGuide(ex,'en')).toBe(EXERCISE_GUIDES[ex.id].en);
  expect(ex.instructions).toEqual(['saved']);
 });
});
