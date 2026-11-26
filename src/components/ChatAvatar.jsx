import AvatarImage from "./AvatarImage";
import {subscribeIdentity} from "../lib/chatLiveIdentity";
import {useEffect,useState} from 'react';
import {getChatProfile,chatAvatarUrl} from '../lib/chatIdentity';
export default function ChatAvatar({userId,label='',className='',developer=false,identityVersion=0}){const [url,setUrl]=useState(null),[epoch,setEpoch]=useState(0);useEffect(()=>subscribeIdentity(userId,()=>setEpoch(x=>x+1)),[userId]);useEffect(()=>{let live=true;setUrl(null);if(userId)getChatProfile(userId).then(p=>p?.avatar_path?chatAvatarUrl(p.avatar_path):null).then(u=>{if(live)setUrl(u);}).catch(()=>{});return()=>{live=false;};},[userId,epoch,identityVersion]);return <span className={`gymak-avatar ${className}`} aria-hidden="true">{url?<AvatarImage src={url} alt="" onError={()=>setUrl(null)}/>:developer?<AvatarImage src="/icon-192.png" alt=""/>:<AvatarImage src="/avatar-default.svg" alt=""/>}</span>;}
