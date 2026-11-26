// A local draft is independent of medical/doctor plans and never replaces them.
export function mealPlannerKey(owner){if(!owner)throw Error('sign_in_required');return 'gymak_meal_planner_v1:'+owner;}
export function loadMealPlanner(owner,storage=localStorage){
 const raw=storage.getItem(mealPlannerKey(owner));if(!raw)return null;
 let x;try{x=JSON.parse(raw);}catch{throw Error('meal_plan_corrupt');}
 if(!validMealPlanner(x))throw Error('meal_plan_corrupt');return x;
}
export function validMealPlanner(x){return x?.schema===1&&typeof x.id==='string'&&Array.isArray(x.days)&&[7,30].includes(x.days.length)&&(!x.completedDays||(typeof x.completedDays==='object'&&!Array.isArray(x.completedDays)&&Object.entries(x.completedDays).every(([k,v])=>/^\d+$/.test(k)&&Number(k)<x.days.length&&v===true)))&&x.days.every(d=>d&&Array.isArray(d.meals)&&d.meals.length<=10&&d.meals.every(m=>m&&typeof m.slot==='string'&&Array.isArray(m.items)&&m.items.length<=30&&m.items.every(i=>i&&typeof i.name==='string'&&i.name.length<=150&&Number.isFinite(i.grams)&&i.grams>0&&i.grams<=3000&&Number.isFinite(i.kcal)&&i.kcal>=0&&Number.isFinite(i.protein)&&i.protein>=0)));}
export function saveMealPlanner(owner,draft,storage=localStorage){if(!validMealPlanner(draft))throw Error('invalid_meal_plan');const s=JSON.stringify(draft);if(s.length>250000)throw Error('meal_plan_too_large');storage.setItem(mealPlannerKey(owner),s);if(storage.getItem(mealPlannerKey(owner))!==s)throw Error('meal_plan_save_failed');if(typeof window!=='undefined')window.dispatchEvent(new Event('gymak-private-draft'));return draft;}
export function createMealPlanner(days,target,seed=0){const x={schema:1,id:crypto.randomUUID(),updatedAt:Date.now(),seed,target,days:JSON.parse(JSON.stringify(days)),checked:{}};if(!validMealPlanner(x))throw Error('invalid_meal_plan');return x;}
export function updateMealPortion(draft,day,slot,item,grams,lookup){
 if(!Number.isFinite(grams)||grams<=0||grams>3000)throw Error('invalid_portion');
 const next=JSON.parse(JSON.stringify(draft)),row=next.days[day]?.meals[slot]?.items[item];if(!row)throw Error('missing_meal_item');
 const value=lookup(row.name,grams);if(!value||!Number.isFinite(value.kcal)||!Number.isFinite(value.protein)||value.kcal<0||value.protein<0)throw Error('unknown_food');
 Object.assign(row,{grams,kcal:Math.round(value.kcal),protein:Math.round(value.protein)},...['carbs','fat'].map(k=>Number.isFinite(value[k])?{[k]:Math.round(value[k]*10)/10}:{}));
 for(const d of next.days){for(const m of d.meals)m.kcal=m.items.reduce((n,i)=>n+i.kcal,0);d.kcal=d.meals.reduce((n,m)=>n+m.kcal,0);d.protein=d.meals.flatMap(m=>m.items).reduce((n,i)=>n+i.protein,0);}
 next.checked={};next.updatedAt=Date.now();return next;
}
