import {normalizeSearchUsername} from "./usernameSearch";
import {notifyIdentityChanged} from "./chatLiveIdentity";
import {supabase} from './supabaseClient';
import {withTimeout} from './authLogic';
export async function identityRpc(name,args={}){if(!supabase)throw Error('not_configured');const {data,error}=await withTimeout(supabase.rpc(name,args),15000);if(error)throw error;return data;}
export const setVerified=(id,value)=>identityRpc('chat_set_verified',{p_user_id:id,p_verified:value});
export const ownerBadges=()=>identityRpc('chat_owner_badges');
export const listRoleRequests=()=>identityRpc('chat_role_requests_list');
export const submitRoleRequest=(role,note)=>identityRpc('chat_role_request_submit',{p_role:role,p_note:note});
export const decideRoleRequest=(id,approve,verify)=>identityRpc('chat_role_request_decide',{p_request_id:id,p_approve:approve,p_verify:verify});
export function roleRequestError(error,en=false){const s=String(error?.message||error);if(/request_pending/.test(s))return en?'You already have a pending request.':'عندك طلب مستني الرد بالفعل.';if(/request_rate_limited/.test(s))return en?'You can submit one request every seven days.':'تقدر تبعت طلب واحد كل 7 أيام.';if(/request_closed/.test(s))return en?'This request was already decided. Refresh.':'الطلب اتراجع بالفعل. حدّث القائمة.';return en?'Could not complete this. Check your connection and try again.':'معرفناش نكمل. راجع النت وحاول تاني.';}
export const getChatProfile=id=>identityRpc('chat_profile_get',{p_user_id:id});
export const saveChatProfile=async(p)=>{await identityRpc('chat_profile_save',{p_name:p.display_name,p_bio:p.bio,p_avatar:p.avatar_path||null,p_visible:p.visible,p_reads:p.read_receipts});signedAvatars.clear();notifyIdentityChanged();};
export const acknowledgeChat=(id,seq,read=false)=>identityRpc('chat_ack',{p_thread:id,p_through:seq,p_read:read});
export const receiptStatus=id=>identityRpc('chat_receipt_status',{p_thread:id});
const signedAvatars=new Map();
export async function chatAvatarUrl(path){if(!path)return null;const {data,error}=await supabase.storage.from('chat-avatars').createSignedUrl(path,120);if(error)throw error;signedAvatars.set(path,{url:data.signedUrl,until:Date.now()+90000});return `${data.signedUrl}&v=${Date.now()}`;}
export async function uploadChatAvatar(userId,blob){if(!blob||blob.type!=='image/jpeg'||blob.size>102400)throw Error('avatar_size');const path=`${userId}/chat-avatar.jpg`;const {error}=await supabase.storage.from('chat-avatars').upload(path,blob,{contentType:'image/jpeg',upsert:true,cacheControl:'0'});if(error)throw error;signedAvatars.delete(path);return path;}
export const discoveryStatus=()=>identityRpc('chat_discovery_status');
export const saveDiscovery=enabled=>identityRpc('chat_discovery_save',{p_enabled:enabled});
export const usernameLookup=name=>identityRpc('chat_username_lookup',{p_username:normalizeSearchUsername(name)});
export const usernameStart=id=>identityRpc('chat_username_start',{p_user_id:id});

// One-time default import only. Server ON CONFLICT preserves every saved privacy choice.
export const importDefaultChatAvatar=path=>identityRpc('chat_default_avatar',{p_avatar:path});
