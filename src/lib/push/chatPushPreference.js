import {supabase} from '../supabaseClient';
export async function getChatPushPreview(client=supabase){if(!client)throw Error('not_configured');const {data,error}=await client.rpc('chat_push_preference_v1');if(error)throw error;return data===true;}
export async function saveChatPushPreview(preview,userId,client=supabase){if(!client||!userId)throw Error('sign_in_required');const {error}=await client.rpc('chat_push_preference_save_v1',{p_preview:preview===true,p_expected_user:userId});if(error)throw error;}
