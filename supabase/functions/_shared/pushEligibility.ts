// Fail closed immediately before the provider call. No row means default ON.
export async function pushAllowed(db:any,token:string,category:string){
 const {data:device,error}=await db.from('push_tokens').select('user_id,is_active').eq('token',token).maybeSingle();
 if(error)throw Error('push_device_check_failed');if(!device?.is_active||!device.user_id)return false;
 const {data:prefs,error:e}=await db.from('push_preferences').select('category,enabled').eq('user_id',device.user_id).in('category',['master',category]);
 if(e)throw Error('push_preference_check_failed');
 return !(prefs||[]).some((p:any)=>p.enabled===false);
}
// Run after provider authentication, directly before the send request.
export async function queuedBroadcastAllowed(db:any,id:string){
 const {data,error}=await db.from('notifications').select('status').eq('id',id).maybeSingle();
 if(error)throw Error('notification_status_check_failed');
 return data?.status==='sending';
}
