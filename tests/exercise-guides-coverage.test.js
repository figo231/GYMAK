import { describe,it,expect } from 'vitest';
import Store from '../src/lib/store/gymakStore';
import { WOMEN_EXERCISES } from '../src/lib/content/womenContent';
import { EXERCISE_GUIDES } from '../src/lib/exerciseGuides';
import { APK23_PULL_GUIDES } from '../src/lib/exerciseGuidesApk23Pull';
import { APK23_LEG_GUIDES } from '../src/lib/exerciseGuidesApk23Legs';
import { APK23_CORE_GUIDES } from '../src/lib/exerciseGuidesApk23Core';
import { APK23_UPPER_GUIDES } from '../src/lib/exerciseGuidesApk23Upper';
import { APK23_CURL_GUIDES } from '../src/lib/exerciseGuidesApk23Curls';
import { APK23_SUPPORTED_GUIDES } from '../src/lib/exerciseGuidesApk23Supported';
import { APK23_TRICEPS_GUIDES } from '../src/lib/exerciseGuidesApk23Triceps';
import { APK23_LOWER_GUIDES } from '../src/lib/exerciseGuidesApk23Lower';
import { APK23_STABILITY_GUIDES } from '../src/lib/exerciseGuidesApk23Stability';
import { APK23_PUSHUP_GUIDES } from '../src/lib/exerciseGuidesApk23Pushups';
import { APK23_SQUAT_BRIDGE_GUIDES } from '../src/lib/exerciseGuidesApk23SquatBridge';
import { APK23_MACHINE_PULL_GUIDES } from '../src/lib/exerciseGuidesApk23MachinePull';
describe('detailed guide coverage',()=>{
 it('maps every guide to a real built-in exercise',()=>{
  localStorage.clear();
  const ids=new Set([...Store.getExercises().filter(e=>!e.custom),...WOMEN_EXERCISES].map(e=>e.id));
  expect(ids.size).toBe(148);
  expect(Object.keys(EXERCISE_GUIDES)).toHaveLength(66);
  for(const id of Object.keys(EXERCISE_GUIDES))expect(ids.has(id),id).toBe(true);
 });
 it('keeps apk23 batches unique and source-linked',()=>{
  const groups=[APK23_PULL_GUIDES,APK23_LEG_GUIDES,APK23_CORE_GUIDES,APK23_UPPER_GUIDES,APK23_CURL_GUIDES,APK23_SUPPORTED_GUIDES,APK23_TRICEPS_GUIDES,APK23_LOWER_GUIDES,APK23_STABILITY_GUIDES,APK23_PUSHUP_GUIDES,APK23_SQUAT_BRIDGE_GUIDES,APK23_MACHINE_PULL_GUIDES];
  const keys=groups.flatMap(g=>Object.keys(g));
  expect(new Set(keys).size).toBe(keys.length);
  for(const group of groups)for(const [id,guide] of Object.entries(group)){
   expect(EXERCISE_GUIDES[id]).toBe(guide);
   expect(guide.source).toMatch(/^https:\/\//);
  }
 });
});
