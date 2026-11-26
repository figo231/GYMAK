import {Capacitor} from '@capacitor/core';
import {buildSmartWorkoutReminders} from '../workoutIntelligence';
const IDS=Array.from({length:7},(_,i)=>4200+i);
const owner=()=>localStorage.getItem('gymak_local_data_owner_v1');
const key=()=> 'gymak_smart_reminder_v1:'+owner();
export function getSmartReminder(){try{const x=JSON.parse(localStorage.getItem(key())||'null');return {enabled:x==null?true:x.enabled===true,time:/^([01]\d|2[0-3]):[0-5]\d$/.test(x?.time)?x.time:'19:00',weekdays:Array.isArray(x?.weekdays)?x.weekdays.filter(d=>Number.isInteger(d)&&d>=0&&d<7):[0,1,2,3,4]};}catch{return {enabled:true,time:'19:00',weekdays:[0,1,2,3,4]};}}
export function saveSmartReminder(prefs){if(!owner())throw Error('sign_in_required');localStorage.setItem(key(),JSON.stringify(prefs));}
export async function syncSmartReminder(trainedDates,{requestPermission=false,lang='ar',prefs=getSmartReminder()}={}){
 if(!Capacitor.isNativePlatform())return {supported:false,enabled:false};
 const {LocalNotifications:LN}=await import('@capacitor/local-notifications');
 let p=await LN.checkPermissions();
 if(prefs.enabled&&p.display!=='granted'&&requestPermission)p=await LN.requestPermissions();
 if(prefs.enabled&&p.display!=='granted')return {supported:true,enabled:false,denied:true};
 const notifications=owner()?buildSmartWorkoutReminders(prefs,trainedDates).map(n=>({id:n.id,isExactNotification:false,title:'GYMAK',body:lang==='en'?'Your workout time. Already trained? Open the app to update your reminders.':'ده ميعاد تمرينك. خلصت؟ افتح التطبيق عشان نحدّث تنبيهاتك.',schedule:{at:n.at,allowWhileIdle:true}})):[];
 await LN.cancel({notifications:IDS.map(id=>({id}))});
 if(notifications.length)await LN.schedule({notifications});
 return {supported:true,enabled:prefs.enabled,count:notifications.length};
}
