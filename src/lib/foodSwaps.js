// Ranked by calorie and protein distance. Estimates, never allergy-safe claims.
export function foodGroup(name) {
 if(/أرز|ارز|رز |مكرونة|عيش|بطاط|شوفان|برغل|فريك|كينوا|توست/.test(name))return 'starch';
 if(/فراخ|دجاج|لحمة|لحم |سمك|تونة|كبدة|كباب|كفتة|سلمون|جمبري/.test(name))return 'protein';
 if(/جبنة|زبادي|لبن|حليب|بيض/.test(name))return 'dairy-eggs';
 if(/فول|عدس|حمص|فاصوليا|لوبيا/.test(name))return 'legume';
 if(/موز|تفاح|برتقال|رمان|بطيخ|عنب|مانجو|تمر|فراولة|كمثرى|خوخ/.test(name))return 'fruit';
 if(/سلطة|خيار|طماطم|بروكلي|سبانخ|كوسة/.test(name))return 'vegetable';
 return 'other';
}
export function foodSwaps(source,catalog,exclude=[]){
 if(!source||!Number.isFinite(source.kcal)||source.kcal<=0||!Number.isFinite(source.protein))return [];
 const banned=exclude.map(s=>s.trim().toLowerCase()).filter(Boolean);
 const group=foodGroup(source.name);
 return catalog.filter(f=>Object.values(f.per100||{}).every(Number.isFinite)&&Number.isFinite(f.per100?.protein)&&f.per100.kcal>0&&(group==='other'?false:foodGroup(f.name)===group)&&f.name!==source.name&&!banned.some(x=>f.name.toLowerCase().includes(x)||f.aliases?.some(a=>a.toLowerCase().includes(x)))).map(f=>{
 const grams=Math.round((source.kcal/f.per100.kcal*100)/5)*5;
 if(!Number.isFinite(grams)||grams<20||grams>500)return null;
 const row={name:f.name,grams,kcal:Math.round(f.per100.kcal*grams/100),protein:Math.round(f.per100.protein*grams)/100,carbs:Math.round(f.per100.carbs*grams)/100,fat:Math.round(f.per100.fat*grams)/100};
 const proteinDelta=Math.abs(row.protein-source.protein),kcalDelta=Math.abs(row.kcal-source.kcal);
 if(proteinDelta>Math.max(5,source.protein*.25)||kcalDelta>Math.max(20,source.kcal*.12))return null;
 return {...row,score:proteinDelta/Math.max(5,source.protein)+kcalDelta/source.kcal};
 }).filter(Boolean).sort((a,b)=>a.score-b.score).slice(0,6);
}
