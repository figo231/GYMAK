import {useEffect} from 'react';
import {useAuth} from '../hooks/useAuth';
import Store from '../lib/store/gymakStore';
import {isNative,cancelAllAppReminders,applyExtraReminders,enableNativeReminder,disableNativeReminder,syncMissedReminder} from '../lib/push/nativeReminder';
import {getSmartReminder,syncSmartReminder} from '../lib/push/smartReminder';
import {mayScheduleReminders} from '../lib/push/reminderAccount';
// One serialized writer prevents logout/cancellation racing an older schedule.
let tail=Promise.resolve();
const enqueue=fn=>{tail=tail.catch(()=>{}).then(fn).catch(()=>{});};
export default function NativeReminderLifecycle(){
 const {user,loading,isPasswordRecovery,guestImport}=useAuth();
 useEffect(()=>{
  if(!isNative())return;
  let live=true,timer;
  const refresh=()=>{clearTimeout(timer);timer=setTimeout(()=>enqueue(async()=>{
   if(!live)return;
   const settings=Store.getSettings();
   if(!mayScheduleReminders({userId:user?.id,ownerId:localStorage.getItem('gymak_local_data_owner_v1'),ready:!loading&&guestImport?.status==='ready'&&guestImport?.userId===user?.id,recovery:isPasswordRecovery,master:settings.notificationsMaster})) {await cancelAllAppReminders();return;}
   await syncSmartReminder(Store.getRawStateForSync().workoutDays,{prefs:getSmartReminder(),lang:Store.getLang()});
   if(!live)return;
   await applyExtraReminders(Store.getReminderPrefs(),{requestPermission:false});
   if(!live)return;
   if(settings.notifEnabled)await enableNativeReminder(settings.notifTime,Store.getLang(),{requestPermission:false});else await disableNativeReminder();
   if(!live)return;
   await syncMissedReminder(Store.getReminderPrefs(),Store.trainedOn(),!document.hidden);
  }),200);};
  refresh();const stop=Store.onChange(refresh);document.addEventListener('visibilitychange',refresh);
  return()=>{live=false;clearTimeout(timer);stop();document.removeEventListener('visibilitychange',refresh);enqueue(cancelAllAppReminders);};
 },[user?.id,loading,isPasswordRecovery,guestImport?.status,guestImport?.userId]);
 return null;
}
