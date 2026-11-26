import {localISO,shiftISO} from './dateKey';
// Explainable suggestions only. Never changes a target or a user's plan.
export function progressionSuggestion(logs,{targetReps=10,increment=2.5,unit='reps'}={}){
 if(unit==='sec')return {kind:'timed',reason:'timed_exercise'};
 const clean=(logs||[]).filter(l=>/^\d{4}-\d{2}-\d{2}$/.test(l.date)&&Number.isFinite(l.weight)&&l.weight>=0&&Number.isInteger(l.reps)&&l.reps>0).slice().sort((a,b)=>a.date.localeCompare(b.date)||(a.at||0)-(b.at||0));
 const days=[...new Set(clean.map(l=>l.date))];if(days.length<2)return {kind:'learn',reason:'two_days_needed'};
 const lastTwo=days.slice(-2).map(d=>clean.filter(l=>l.date===d));
 const last=lastTwo[1].at(-1);if(last.weight===0)return {kind:'maintain',weight:0,reason:'bodyweight'};
 const sameLoad=lastTwo.every(day=>day.every(l=>l.weight===last.weight));
 const hard=lastTwo.some(day=>day.some(l=>l.rir!=null&&l.rir<=1));
 const effortKnown=lastTwo.every(day=>day.every(l=>Number.isInteger(l.rir)&&l.rir>=2&&l.rir<=5));
 const repsMet=lastTwo.every(day=>day.length>=2 && day.every(l=>l.reps>=targetReps));
 if(sameLoad&&repsMet&&effortKnown&&!hard){const step=Number.isFinite(increment)&&increment>0&&increment<=10?increment:2.5;return {kind:'consider',weight:Math.round((last.weight+step)*100)/100,previousWeight:last.weight,reason:'two_consistent_days'};}
 return {kind:'maintain',weight:last.weight,reason:hard?'high_effort':'build_consistency'};
}
export function suggestedWorkoutTime(logs){
 const stamps=Object.values(logs||{}).flat().map(l=>typeof l.at==='number'?l.at:Date.parse(l.at)).filter(n=>typeof n==='number'&&Number.isFinite(n)&&n>0).sort((a,b)=>b-a);
 const days=new Set(),hours=[];
 for(const at of stamps){const d=new Date(at),key=localISO(d);if(days.has(key))continue;days.add(key);hours.push(d.getHours()*60+d.getMinutes());if(hours.length===14)break;}
 if(hours.length<3)return null;
 // Circular distance handles late-night sessions across midnight.
 const distance=(a,b)=>Math.min(Math.abs(a-b),1440-Math.abs(a-b));
 const best=hours.reduce((a,b)=>hours.reduce((n,h)=>n+distance(b,h),0)<hours.reduce((n,h)=>n+distance(a,h),0)?b:a,hours[0]);
 const minute=(Math.round(best/15)*15)%1440;
 return {time:String(Math.floor(minute/60)).padStart(2,'0')+':'+String(minute%60).padStart(2,'0'),sampleDays:hours.length};
}
export function buildSmartWorkoutReminders({enabled,time,weekdays},trainedDates,now=new Date()){
 if(!enabled||!/^([01]\d|2[0-3]):[0-5]\d$/.test(time)||!Array.isArray(weekdays))return [];
 const days=new Set(weekdays.filter(d=>Number.isInteger(d)&&d>=0&&d<=6)),trained=new Set(trainedDates||[]),[h,m]=time.split(':').map(Number),out=[];
 for(let i=0;i<7;i++){
  const date=shiftISO(localISO(now),i),[y,mo,d]=date.split('-').map(Number),at=new Date(y,mo-1,d,h,m);
  if(!days.has(at.getDay())||trained.has(date)||at<=now)continue;
  out.push({id:4200+i,date,at,time});
 }
 return out;
}
