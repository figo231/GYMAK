import {beforeEach,describe,it,expect,vi} from 'vitest';
import fs from 'node:fs';
import {GYM_EXPANSION,WOMEN_GYM_EXPANSION} from '../src/lib/content/gymExpansion';
import {GYM_EXPANSION_GUIDES} from '../src/lib/exerciseGuidesGymExpansion';
import {normalizeExercise,haystack,matchesQuery} from '../src/lib/exerciseMeta';
import {getExerciseFrames} from '../src/lib/exerciseImages';
import {parseLogForm} from '../src/lib/logLogic';
let S;
beforeEach(async()=>{localStorage.clear();vi.resetModules();S=(await import('../src/lib/store/gymakStore')).default;S.resetAllData();});
describe('balanced gym expansion',()=>{
 it('adds ten female moves across all missing upper-body groups, core and cardio',()=>{
  expect(WOMEN_GYM_EXPANSION).toHaveLength(10);
  expect(new Set(WOMEN_GYM_EXPANSION.map(e=>e.muscle))).toEqual(new Set(['back','chest','shoulders','arms','core','cardio']));
  for(const e of WOMEN_GYM_EXPANSION){expect(e.only).toBe('female');expect(e.venue).toBe('gym');}
 });
 it('includes six shared gym movements and sixteen complete bilingual guides',()=>{
  expect(GYM_EXPANSION).toHaveLength(6);
  for(const e of [...GYM_EXPANSION,...WOMEN_GYM_EXPANSION]){
   const guide=GYM_EXPANSION_GUIDES[e.id];expect(guide.source).toMatch(/^https:/);
   for(const lang of ['ar','en']){for(const key of ['summary','setup','feel','safety'])expect(guide[lang][key].length).toBeGreaterThan(25);expect(guide[lang].steps.length).toBeGreaterThanOrEqual(4);expect(guide[lang].mistakes.length).toBeGreaterThanOrEqual(3);}
   for(const path of getExerciseFrames(e.id))expect(fs.existsSync(`public${path}`),path).toBe(true);
  }
 });
 it('searches shared and female moves by English names in Arabic mode',()=>{
  for(const[id,q]of [['pallof-press','Pallof'],['rowing-ergometer','rowing'],['w-lat-pulldown','pulldown']]){
   const ex=[...GYM_EXPANSION,...WOMEN_GYM_EXPANSION].find(e=>e.id===id);expect(matchesQuery(haystack(normalizeExercise(ex)),q)).toBe(true);
  }
 });
 it('logs cardio in seconds without adding tonnage, peak weights or strength PRs',()=>{
  const e=S.getExerciseById('incline-treadmill-walk');expect(e.unit).toBe('sec');expect(e.reps).toBe(300);expect(e.sets).toBe(1);
  expect(parseLogForm({weight:'0',sets:'1',reps:'1800'},v=>v,true)).toMatchObject({ok:true,reps:1800});
  S.logSet(e.id,0,1,1800);expect(S.getExerciseLogs(e.id)[0].reps).toBe(1800);expect(S.getTonnage()).toBe(0);expect(S.getPeakWeight()).toBeNull();expect(S.getRecentPRs()).toEqual([]);
 });
 it('backfills new seeds while preserving custom edits, logs and deletion tombstones',async()=>{
  S.setGender('female');S.logSet('bench-press-barbell',20,3,8);
  const st=S.get();st.exercises=st.exercises.filter(e=>![...GYM_EXPANSION,...WOMEN_GYM_EXPANSION].some(n=>n.id===e.id));st.exercises.find(e=>e.id==='bench-press-barbell').name='Preserved bench';st.deletedExerciseIds=['pallof-press'];localStorage.setItem('gymak_state_v1',JSON.stringify(st));vi.resetModules();const T=(await import('../src/lib/store/gymakStore')).default;
  expect(T.getExerciseById('single-arm-landmine-press')).toBeTruthy();expect(T.getExerciseById('w-lat-pulldown')).toBeTruthy();expect(T.getExerciseById('bench-press-barbell').name).toBe('Preserved bench');expect(T.getExerciseLogs('bench-press-barbell')).toHaveLength(1);expect(T.getExerciseById('pallof-press')).toBeNull();
 });
});

describe('larger gym batch',()=>{
 it('adds 13 distinct shared and six women-tagged movements with bilingual guides',async()=>{
  const {GYM_EXPANSION_MORE:a,WOMEN_GYM_EXPANSION_MORE:w}=await import('../src/lib/content/gymExpansionMore');const{GYM_EXPANSION_MORE_GUIDES:g}=await import('../src/lib/exerciseGuidesGymExpansionMore');
  expect(a).toHaveLength(13);expect(w).toHaveLength(6);expect(new Set(a.map(e=>e.muscle)).size).toBe(6);
  const all=[...GYM_EXPANSION,...WOMEN_GYM_EXPANSION,...a,...w];expect(new Set(all.map(e=>e.id)).size).toBe(35);
  for(const e of [...a,...w]){expect(g[e.id].source).toMatch(/^https:/);for(const lang of ['ar','en']){expect(g[e.id][lang].steps.length).toBeGreaterThanOrEqual(4);expect(g[e.id][lang].mistakes).toHaveLength(3);expect(g[e.id][lang].safety.length).toBeGreaterThan(30);}}
 });
 it('hides rejected illustrations and serves checked frames for every other addition',async()=>{
  const{GYM_EXPANSION_MORE:a,WOMEN_GYM_EXPANSION_MORE:w}=await import('../src/lib/content/gymExpansionMore');for(const e of [...a,...w]){const frames=getExerciseFrames(e.id);if(['single-arm-cable-chest-press','barbell-front-squat'].includes(e.id)){expect(frames).toBeNull();continue;}expect(frames).toHaveLength(2);for(const p of frames)expect(fs.existsSync(`public${p}`)).toBe(true);}
 });
});
