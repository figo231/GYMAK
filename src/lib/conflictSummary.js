import Store from "./store/gymakStore";
// Readable conflict previews only. Original values and merge choices stay unchanged.
export function conflictSummary(type, value = {}, lang = 'ar') {
 const en=lang==='en',v=value||{},none=en?'Not set':'مش متحدد',pair=(a,b,x)=>`${en?a:b}: ${x??none}`,number=(x,u)=>x==null?none:`${x} ${u}`;
 if(type==='profile')return [pair('Unit','وحدة الوزن',v.unit==='lb'?(en?'Pounds':'رطل'):v.unit==='kg'?(en?'Kilograms':'كيلوجرام'):none),pair('Gender','النوع',v.gender==='female'?(en?'Female':'أنثى'):v.gender==='male'?(en?'Male':'ذكر'):none),pair('Height','الطول',number(v.heightCm,en?'cm':'سم')),pair('Goal weight','الوزن المستهدف',number(v.goalWeight,en?'kg':'كجم')),pair('Language','اللغة',v.lang==='en'?'English':v.lang==='ar'?'العربية':none),pair('Training program','برنامج التدريب',v.activeProgramId?(Store.getAllPrograms().find(p=>p.id===v.activeProgramId)?.name||(en?'Saved program':'برنامج محفوظ')):none)];
 if(type==='weight')return [pair('Weight','الوزن',number(v.weight,en?'kg':'كجم')),pair('Body fat','نسبة الدهون',number(v.bodyFat??v.body_fat,'%'))];
 if(type==='food')return [pair('Foods','الأكلات',(v.items||[]).map(x=>x.name||x.label||x.foodName||(en?'Saved food':'أكلة محفوظة')).join('، ')||none),pair('Calories','السعرات',v.totalKcal??v.total_kcal??0),pair('Protein','البروتين',number(v.totalProtein??v.total_protein,en?'g':'جم')),pair('Carbs','الكربوهيدرات',number(v.totalCarbs??v.total_carbs,en?'g':'جم')),pair('Fat','الدهون',number(v.totalFat??v.total_fat,en?'g':'جم'))];
 const muscles={chest:'صدر',back:'ظهر',legs:'رجل',shoulders:'كتف',arms:'ذراع',abs:'بطن',biceps:'بايسبس',triceps:'ترايسبس',glutes:'مؤخرة',fullbody:'الجسم كله'};
 return [pair('Name','الاسم',v.name||none),pair('Muscle','العضلة',en?(v.muscle||none):(muscles[v.muscle]||v.muscleLabel||none)),pair('Sets','المجموعات',v.sets),pair('Reps','العدات',v.reps)];
}
