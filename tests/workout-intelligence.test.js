import {describe,it,expect} from 'vitest';
import {progressionSuggestion,suggestedWorkoutTime,buildSmartWorkoutReminders} from '../src/lib/workoutIntelligence';
const logs=[1,2].flatMap(day=>[1,2].map(n=>({date:`2026-11-0${day}`,weight:40,reps:10,at:n,rir:2})));
describe('optional progression guidance',()=>{
 it('requires two training days and consistent sets',()=>{expect(progressionSuggestion(logs.slice(0,2)).kind).toBe('learn');expect(progressionSuggestion(logs).weight).toBe(42.5);expect(progressionSuggestion(logs.map(({rir,...l})=>l)).kind).toBe('maintain');expect(progressionSuggestion([...logs,{date:'2026-11-02',weight:40,reps:8}]).kind).toBe('maintain');});
 it('does not increase high-effort, bodyweight or timed work',()=>{expect(progressionSuggestion(logs.map(l=>({...l,rir:1}))).kind).toBe('maintain');expect(progressionSuggestion(logs.map(l=>({...l,weight:0}))).weight).toBe(0);expect(progressionSuggestion(logs,{unit:'sec'}).kind).toBe('timed');});
});
describe('user-approved reminder suggestions',()=>{
 it('learns once per day and needs three separate days',()=>{const at=(day,h)=>new Date(2026,10,day,h,0).getTime();expect(suggestedWorkoutTime({a:[{at:at(1,19)},{at:at(1,20)},{at:at(2,19)}]})).toBeNull();expect(suggestedWorkoutTime({a:[{at:at(1,19)},{at:at(2,19)},{at:at(3,20)}]}).time).toBe('19:00');});
 it('handles late-night history without suggesting midday',()=>{const at=(d,h,m)=>new Date(2026,10,d,h,m).getTime();const x=suggestedWorkoutTime({a:[{at:at(1,23,45)},{at:at(2,0,0)},{at:at(3,0,15)}]});expect(x.time).toBe('00:00');});
 it('never schedules past times, completed days or unselected weekdays',()=>{const now=new Date(2026,10,25,18,0);const x=buildSmartWorkoutReminders({enabled:true,time:'19:00',weekdays:[0,1,2,3,4,5,6]},['2026-11-25'],now);expect(x).toHaveLength(6);expect(x[0].date).toBe('2026-11-26');expect(x.every(n=>n.at>now)).toBe(true);expect(buildSmartWorkoutReminders({enabled:false,time:'19:00',weekdays:[3]},[],now)).toEqual([]);});
});
