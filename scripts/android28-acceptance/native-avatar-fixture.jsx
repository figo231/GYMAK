// Verification-build-only entry. Never copy this fixture to production.
import React from 'react';
import {createRoot} from 'react-dom/client';
import AvatarImage from './src/components/AvatarImage';
const image=(w,h)=>'data:image/svg+xml;base64,'+btoa(`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}"><rect width="100%" height="100%" fill="#34576d"/><rect x="0" y="0" width="16" height="16" fill="#ff791b"/><rect x="${w-16}" y="${h-16}" width="16" height="16" fill="#fdcf33"/><path d="M0 0L${w} ${h}M${w} 0L0 ${h}" stroke="white" stroke-width="3"/></svg>`);
let root;
window.__showAvatarVerification=theme=>{
 localStorage.setItem('gymak_theme_pref',theme);
 document.documentElement.setAttribute('data-theme',theme);
 document.dispatchEvent(new Event('visibilitychange')); 
 let node=document.querySelector('#avatar-native-verification');if(!node){node=document.createElement('section');node.id='avatar-native-verification';document.body.append(node);}
 node.style='position:fixed;inset:0;z-index:999999;background:var(--bg-deep-2);padding:20px;display:grid;grid-template-columns:repeat(3,1fr);gap:18px;overflow:auto;align-content:start';
 const sizes=[['gymak-avatar pc-avatar',48],['gymak-avatar pc-chat-avatar',42],['gymak-avatar pc-message-avatar',28],['profile-avatar',88],['p-avatar-ring',78],['avatar-ring',60]];
 localStorage.setItem('avatar-native-preserve','kept');
 root ||= createRoot(node);root.render(<>{sizes.flatMap(([cls,size])=>[[60,160],[160,60],[100,100]].map(([w,h])=><div key={cls+w} style={{width:size,height:size,position:'relative'}}><span className={cls} style={{width:size,height:size}}><AvatarImage src={image(w,h)}/></span></div>))}</>);
 const mark=()=>{node.querySelectorAll('img').forEach(i=>{if(i.complete&&i.naturalWidth)i.setAttribute('data-ready','1');});if(node.querySelectorAll('img[data-ready]').length<18)setTimeout(mark,30);};setTimeout(mark,30);
};
window.__avatarVerificationReady=true;

import * as measure from './src/lib/measure/measure';
import * as water from './src/lib/water/water';
window.__storageVerification={measure,water};
