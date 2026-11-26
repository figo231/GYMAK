// Offline general planning for adults, not a treatment or allergy-safety guarantee.
// Energy estimate: Mifflin-St Jeor (1990), https://pubmed.ncbi.nlm.nih.gov/2305711/
// Activity multipliers: https://reference.medscape.com/calculator/846/mifflin-st-jeor-equation-calculator
export const DIET_DEFAULTS={goal:'maintain',age:'',sex:'',height:'',weight:'',activity:'light',meals:4,style:'mixed',budget:'economy',allergies:[],avoid:[],medical:false,ack:false};
export const DIET_FOODS=[
 {name:'فول مدمس',tags:['pulses'],cost:'economy',plant:true,g:220},
 {name:'عيش بلدي',tags:['gluten'],cost:'economy',plant:true,g:90},
 {name:'بيضة مسلوقة',tags:['egg'],cost:'economy',plant:false,g:100},
 {name:'جبنة قريش',tags:['dairy'],cost:'economy',plant:false,g:150},
 {name:'زبادي',tags:['dairy'],cost:'economy',plant:false,g:200},
 {name:'شوفان',tags:['gluten'],cost:'economy',plant:true,g:70},
 {name:'موز',tags:[],cost:'economy',plant:true,g:150},
 {name:'سلطة بلدي',tags:[],cost:'economy',plant:true,g:200},
 {name:'أرز',tags:[],cost:'economy',plant:true,g:220},
 {name:'فراخ مشوية',tags:['meat'],cost:'flexible',plant:false,g:180},
 {name:'سمك مشوي',tags:['fish','meat'],cost:'flexible',plant:false,g:180},
 {name:'زيت زيتون',tags:[],cost:'economy',plant:true,g:10},
 {name:'تونة',tags:['fish','meat'],cost:'flexible',plant:false,g:120},
];
export const DIET_TAGS=['dairy','egg','gluten','fish','pulses','meat'];
export function dietAssessment(p){
 const age=Number(p.age),height=Number(p.height),weight=Number(p.weight);
 if(!Number.isFinite(age)||age<1||age>120||!Number.isFinite(height)||height<100||height>230||!Number.isFinite(weight)||weight<25||weight>250||!['male','female'].includes(p.sex)||!['lose','maintain','gain','muscle'].includes(p.goal)||!['low','light','moderate','high'].includes(p.activity)||![3,4,5].includes(Number(p.meals))||!['mixed','vegetarian','vegan'].includes(p.style)||!['economy','flexible'].includes(p.budget)||!Array.isArray(p.allergies)||!Array.isArray(p.avoid)||[...p.allergies,...p.avoid].some(t=>!DIET_TAGS.includes(t)))return {error:'invalid'};
 if(age<19||age>78||p.medical||weight/(height/100)**2<18.5)return {error:'specialist'};
 if(!p.ack)return {error:'ack'};
 const rest=10*weight+6.25*height-5*age+(p.sex==='male'?5:-161),factor={low:1.2,light:1.375,moderate:1.55,high:1.725}[p.activity];
 const maintenance=Math.round(rest*factor/50)*50;
 const target=maintenance+(p.goal==='lose'?-250:['gain','muscle'].includes(p.goal)?200:0);
 if(target<1500||target>3500)return {error:'specialist'};
 return {target,maintenance,rest:Math.round(rest),...(p.goal==='muscle'?{proteinTarget:Math.round(weight*1.8),proteinMin:Math.ceil(weight*1.6),proteinMax:Math.floor(weight*2),proteinPerKg:1.8,surplus:200}:{})};
}
export function buildGuidedDiet(p,lookup,seed=0){
 const a=dietAssessment(p);if(a.error)throw Error(a.error);
 const excluded=new Set([...p.allergies,...p.avoid]);
 const allowed=DIET_FOODS.filter(f=>!f.tags.some(t=>excluded.has(t))&&(p.style!=='vegan'||f.plant)&&(p.style!=='vegetarian'||!f.tags.includes('meat'))&&(p.budget!=='economy'||f.cost==='economy'));
 const names=new Set(allowed.map(f=>f.name));
 const templates=[['فول مدمس','عيش بلدي','بيضة مسلوقة'],['زبادي','شوفان','موز'],['جبنة قريش','عيش بلدي','موز'],['فراخ مشوية','أرز','سلطة بلدي'],['سمك مشوي','أرز','سلطة بلدي'],['فول مدمس','أرز','سلطة بلدي'],['تونة','عيش بلدي'],['بيضة مسلوقة','أرز','سلطة بلدي'],['فول مدمس','عيش بلدي','موز','سلطة بلدي']].filter(x=>x.every(n=>names.has(n)));
 if(templates.length<2)throw Error('limited');
 const days=[];
 for(let d=0;d<30;d++){
  let state=(Math.imul((d+1+seed*31)|0,2654435761)>>>0)||1;
  const order=templates.map((_,i)=>i);
  for(let i=order.length-1;i>0;i--){state=(Math.imul(state,1664525)+1013904223)>>>0;const j=state%(i+1);[order[i],order[j]]=[order[j],order[i]];}
  const picks=Array.from({length:Number(p.meals)},(_,i)=>templates[order[i%order.length]]);
  const raw=picks.flat().reduce((sum,n)=>{const f=allowed.find(x=>x.name===n),m=lookup(n,f.g);if(!m||!Number.isFinite(m.kcal)||m.kcal<=0)throw Error('unknown_food');return sum+m.kcal;},0);
  const factor=a.target/raw;
  const meals=picks.map((names,i)=>{const items=names.map(n=>{const f=allowed.find(x=>x.name===n),grams=Math.max(10,Math.round(f.g*factor/10)*10);if(grams>700)throw Error('limited');const m=lookup(n,grams);if(!m||!Number.isFinite(m.kcal)||!Number.isFinite(m.protein))throw Error('unknown_food');return {name:n,grams,kcal:Math.round(m.kcal),protein:Math.round(m.protein),...(Number.isFinite(m.carbs)?{carbs:Math.round(m.carbs*10)/10}:{}),...(Number.isFinite(m.fat)?{fat:Math.round(m.fat*10)/10}:{})};});return {slot:'meal-'+i,label:String(i+1),items,kcal:items.reduce((s,x)=>s+x.kcal,0)};});
  for(let balance=0;balance<8;balance++){
  const flatFat=meals.flatMap(m=>m.items),hasFat=flatFat.every(i=>Number.isFinite(i.fat));
  if(hasFat){const k=flatFat.reduce((s,i)=>s+i.kcal,0),fat=flatFat.reduce((s,i)=>s+i.fat,0),share=fat*9/k;
   if(share<.2||share>.35){const balanceFood=share<.2?'زيت زيتون':'أرز',oil=lookup(balanceFood,100),targetFat=a.target*.25/9,denom=oil?.fat-oil?.kcal*fat/k,add=(targetFat-a.target*fat/k)/denom*100,scale=(a.target-add*oil?.kcal/100)/k;if(!oil||!Number.isFinite(add)||add<0||scale<.2)throw Error('limited');
    for(const m of meals){for(const i of m.items)i.grams=Math.max(5,Math.round(i.grams*scale/5)*5);const item=m.items.find(i=>i.name===balanceFood),g=Math.round(add/meals.length);if(g>0){if(item)item.grams+=g;else m.items.push({name:balanceFood,grams:g});}for(const i of m.items){const v=lookup(i.name,i.grams);if(!v)throw Error('unknown_food');Object.assign(i,{kcal:Math.round(v.kcal),protein:Math.round(v.protein),carbs:v.carbs,fat:v.fat});}m.kcal=m.items.reduce((s,i)=>s+i.kcal,0);}
   }
  }
  if(p.goal==='muscle'){
   const flat=meals.flatMap(m=>m.items),baseK=flat.reduce((s,i)=>s+i.kcal,0),baseP=flat.reduce((s,i)=>s+i.protein,0);
   const desired=a.proteinTarget,ratio=baseP/baseK;
   if(Math.abs(baseP-desired)>1){
    const candidates=allowed.map(f=>({...f,m:lookup(f.name,100)})).filter(f=>f.m&&Number.isFinite(f.m.protein)&&f.m.kcal>0).sort((x,y)=>(a.target*ratio<desired?-1:1)*(x.m.protein/x.m.kcal-y.m.protein/y.m.kcal));
    const f=candidates[0],denom=f?.m.protein-f?.m.kcal*ratio;
    const boost=(desired-a.target*ratio)/denom*100,scale=(a.target-boost*f?.m.kcal/100)/baseK;
    if(!Number.isFinite(boost)||boost<0||scale<.2||scale>2)throw Error('limited');
    for(const m of meals){for(const i of m.items)i.grams=Math.max(5,Math.round(i.grams*scale/5)*5);const existing=m.items.find(i=>i.name===f.name),g=Math.round(boost/meals.length/5)*5;if(g>0){if(existing)existing.grams+=g;else m.items.push({name:f.name,grams:g});}}
   }
   for(const m of meals){for(const i of m.items){const v=lookup(i.name,i.grams);if(i.grams>700||!v||!Number.isFinite(v.protein)||!Number.isFinite(v.kcal))throw Error('limited');Object.assign(i,{kcal:Math.round(v.kcal),protein:Math.round(v.protein)},...['carbs','fat'].map(k=>Number.isFinite(v[k])?{[k]:Math.round(v[k]*10)/10}:{}));}m.kcal=m.items.reduce((s,i)=>s+i.kcal,0);}
  }
  }
  const energyScale=a.target/meals.reduce((s,m)=>s+m.kcal,0);
  for(const m of meals){for(const i of m.items){i.grams=Math.max(1,Math.round(i.grams*energyScale));const v=lookup(i.name,i.grams);if(!v)throw Error('unknown_food');Object.assign(i,{kcal:Math.round(v.kcal),protein:Math.round(v.protein)},...['carbs','fat'].map(k=>Number.isFinite(v[k])?{[k]:Math.round(v[k]*10)/10}:{}));}m.kcal=m.items.reduce((s,i)=>s+i.kcal,0);}
  if(meals.flatMap(m=>m.items).some(i=>i.grams>700||i.grams<=0||i.kcal<0||i.protein<0))throw Error('limited');
  const protein=meals.flatMap(m=>m.items).reduce((s,i)=>s+i.protein,0);if(protein<Number(p.weight)*.8)throw Error('limited');if(p.goal==='muscle'&&(protein<a.proteinMin||protein>a.proteinMax))throw Error('limited');
  const fatItems=meals.flatMap(m=>m.items);if(fatItems.every(i=>Number.isFinite(i.fat))){const share=fatItems.reduce((s,i)=>s+i.fat,0)*9/fatItems.reduce((s,i)=>s+i.kcal,0);if(share<.195||share>.355)throw Error('limited');}
  const kcal=meals.reduce((s,x)=>s+x.kcal,0);if(Math.abs(kcal-a.target)/a.target>.05)throw Error('limited');
  days.push({meals,kcal,protein:meals.flatMap(x=>x.items).reduce((s,x)=>s+x.protein,0)});
 }
 return {days,target:a.target,...(a.proteinTarget?{proteinTarget:a.proteinTarget,proteinMin:a.proteinMin,proteinMax:a.proteinMax}:{})};
}

export function dietPreparation(name,en=false){if(['أرز','رز أبيض','رز','فول مدمس','فراخ مشوية','سمك مشوي','بيضة مسلوقة'].includes(name))return en?'cooked edible weight':'وزن مطبوخ صالح للأكل';if(name==='شوفان')return en?'dry weight':'وزن جاف';if(name==='تونة')return en?'drained edible weight':'وزن مصفّى صالح للأكل';if(name==='موز')return en?'without peel':'من غير قشر';return en?'as listed, verify preparation':'بنفس وصف الصنف، راجع التحضير';}
