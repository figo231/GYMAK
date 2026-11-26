import {DIET_FOODS} from './guidedDiet';
const macroKeys=['kcal','protein','carbs','fat'];
export function equivalentFood(sourceItems,food,lookup,prefs){
 if(!food||!sourceItems?.length)throw Error('invalid_swap');
 const restrictions=[...(prefs?.allergies||[]),...(prefs?.avoid||[])],tagged=DIET_FOODS.find(f=>f.name===food.name||food.aliases?.includes(f.name));
 if((restrictions.length||prefs?.style&&prefs.style!=='mixed')&&(!tagged||tagged.tags.some(t=>restrictions.includes(t))||(prefs.style==='vegan'&&!tagged.plant)||(prefs.style==='vegetarian'&&tagged.tags.includes('meat'))))throw Error('restricted_swap');
 const source=Object.fromEntries(macroKeys.map(k=>[k,0]));
 for(const i of sourceItems){const m=macroKeys.every(k=>Number.isFinite(i[k]))?i:lookup(i.name,i.grams);if(!m||macroKeys.some(k=>!Number.isFinite(m[k])||m[k]<0))throw Error('unknown_nutrition');for(const k of macroKeys)source[k]+=m[k];}
 if(!Number.isFinite(food.per100?.kcal)||food.per100.kcal<=0||macroKeys.some(k=>!Number.isFinite(food.per100[k])||food.per100[k]<0)||source.kcal<=0)throw Error('unknown_nutrition');
 const grams=Math.round(source.kcal/food.per100.kcal*100*10)/10;if(grams<0.1||grams>3000)throw Error('unsuitable_portion');
 const result={name:food.name,grams,...Object.fromEntries(macroKeys.map(k=>[k,Math.round(food.per100[k]*grams)/100]))};
 return {source,result,delta:Object.fromEntries(macroKeys.map(k=>[k,Math.round((result[k]-source[k])*10)/10]))};
}
export function applyDietSwap(draft,day,meal,item,replacement){
 const x=JSON.parse(JSON.stringify(draft));if(!x.days?.[day]?.meals?.[meal]||!replacement||!Number.isFinite(replacement.grams)||replacement.grams<=0||replacement.grams>3000||typeof replacement.name!=='string'||macroKeys.some(k=>replacement[k]!=null&&(!Number.isFinite(replacement[k])||replacement[k]<0))||!Number.isFinite(replacement.kcal)||!Number.isFinite(replacement.protein))throw Error('invalid_swap');
 if(item==null)x.days[day].meals[meal].items=[replacement];else{if(!x.days[day].meals[meal].items[item])throw Error('invalid_swap');x.days[day].meals[meal].items[item]=replacement;}
 for(const d of x.days){for(const m of d.meals)m.kcal=Math.round(m.items.reduce((s,i)=>s+i.kcal,0));d.kcal=d.meals.reduce((s,m)=>s+m.kcal,0);d.protein=Math.round(d.meals.flatMap(m=>m.items).reduce((s,i)=>s+i.protein,0));}
 x.updatedAt=Date.now();x.checked={};return x;
}
