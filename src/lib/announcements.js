import {supabase} from './supabaseClient';
import {REVIEW_BACKEND_GATED} from './reviewBuild';
async function call(name,args={},client=supabase){
 if(REVIEW_BACKEND_GATED||!client)throw new Error('announcement_unavailable');
 const {data,error}=await client.rpc(name,args);if(error)throw error;return data;
}
export const fetchAnnouncements=(client)=>call('app_announcements_feed',{},client);
export const dismissAnnouncement=(id,client)=>call('app_announcement_dismiss',{p_id:id},client);
export const publishAnnouncement=(title,body,days=30,client)=>call('owner_announcement_publish',{p_title:title.trim(),p_body:body.trim(),p_days:days},client);
export const listOwnerAnnouncements=(client)=>call('owner_announcements_list',{},client);
export const hideAnnouncement=(id,client)=>call('owner_announcement_hide',{p_id:id},client);
