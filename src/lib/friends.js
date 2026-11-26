import {supabase} from './supabaseClient';
import {normalizeSearchUsername} from './usernameSearch';
async function rpc(name,args){if(!supabase)throw Error('unavailable');const {data,error}=await supabase.rpc(name,args);if(error)throw error;return data;}
export const friendSnapshot=()=>rpc('friend_snapshot');
export const saveFriendSettings=p=>rpc('friend_settings',{p_discoverable:!!p.discoverable,p_days:!!p.share_days,p_streak:!!p.share_streak,p_volume:!!p.share_volume});
export const requestFriend=name=>rpc('friend_request',{p_username:normalizeSearchUsername(name)});
export const respondFriend=(peer,accept)=>rpc('friend_respond',{p_peer:peer,p_accept:accept});
export const cheerFriend=peer=>rpc('friend_cheer',{p_peer:peer});
export function rankedFriends(rows,metric){if(!['days','streak','volume'].includes(metric))return [];return [...(rows||[])].filter(x=>Number.isFinite(x[metric])).sort((a,b)=>b[metric]-a[metric]||a.username.localeCompare(b.username));}

export const blockFriend=peer=>rpc('friend_block',{p_peer:peer});
