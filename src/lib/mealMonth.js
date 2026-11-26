import {createMealPlanner,loadMealPlanner,saveMealPlanner,validMealPlanner} from './mealPlannerDraft';
// Explicit upgrade only. Never replace the user's edited first week.
export function upgradeMealMonth(owner,extraDays,storage=localStorage){
 const before=loadMealPlanner(owner,storage);
 if(!before||before.days.length!==7||!Array.isArray(extraDays)||extraDays.length<23)throw Error('month_upgrade_invalid');
 const next={...before,days:[...before.days,...extraDays.slice(0,23)],updatedAt:Date.now(),completedDays:{...before.completedDays}};
 if(!validMealPlanner(next))throw Error('month_upgrade_invalid');
 const snapshot='gymak_meal_before_month_v1:'+owner+':'+crypto.randomUUID(),raw=JSON.stringify(before);
 storage.setItem(snapshot,raw);if(storage.getItem(snapshot)!==raw)throw Error('snapshot_failed');
 saveMealPlanner(owner,next,storage);return next;
}
export function toggleMealDay(draft,index){
 if(!validMealPlanner(draft)||!Number.isInteger(index)||index<0||index>=draft.days.length)throw Error('meal_day_invalid');
 const next=JSON.parse(JSON.stringify(draft));next.completedDays={...next.completedDays};
 if(next.completedDays[index])delete next.completedDays[index];else next.completedDays[index]=true;
 next.updatedAt=Date.now();return next;
}
