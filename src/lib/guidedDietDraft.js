import {dietAssessment} from './guidedDiet';
import {createMealPlanner,loadMealPlanner,saveMealPlanner} from './mealPlannerDraft';
export function saveGuidedDiet(owner,result,answers,storage=localStorage){
 if(dietAssessment(answers).error)throw Error('invalid_guided_diet');
 const before=loadMealPlanner(owner,storage);
 if(before){const key='gymak_meal_before_guided_v1:'+owner+':'+crypto.randomUUID(),raw=JSON.stringify(before);storage.setItem(key,raw);if(storage.getItem(key)!==raw)throw Error('snapshot_failed');}
 const next={...createMealPlanner(result.days,result.target,0),guided:JSON.parse(JSON.stringify(answers))};saveMealPlanner(owner,next,storage);return next;
}
