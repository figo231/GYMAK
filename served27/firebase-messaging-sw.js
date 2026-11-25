/* Separate /push/ registration. Does not replace the offline/PWA worker. */
self.addEventListener('push',event=>{
 let payload;try{payload=event.data.json();}catch{return;}
 const n=payload.notification||{};
 if(!n.title&&!n.body)return;
 event.waitUntil((async()=>{
  const windows=await self.clients.matchAll({type:'window',includeUncontrolled:true});
  const visible=windows.filter(c=>c.visibilityState==='visible'&&new URL(c.url).origin===self.location.origin);
  for(const client of visible)client.postMessage({type:'GYMAK_WEB_PUSH',payload:{notification:n,data:payload.data||{}}});
  if(!visible.length)await self.registration.showNotification(n.title||'GYMAK',{body:n.body||'',icon:'/icon-192.png',tag:payload.data?.notification_id||undefined,data:{path:'/'}});
 })());
});
self.addEventListener('notificationclick',event=>{
 event.notification.close();event.waitUntil((async()=>{const windows=await self.clients.matchAll({type:'window',includeUncontrolled:true});const client=windows.find(c=>new URL(c.url).origin===self.location.origin);if(client){await client.focus();}else{await self.clients.openWindow('/');}})());
});
