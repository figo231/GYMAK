// This manifest is untrusted network data. Native verifier authenticates bundles.
export function validateOtaManifest(m,{nativeBuild,channel,currentVersion,now=Date.now()}){
 if(!m||m.schema!==1||m.enabled!==true||m.channel!==channel)return null;
 if(!Number.isInteger(m.nativeBuild)||m.nativeBuild!==nativeBuild)return null;
 if(!/^web-[1-9]\d*$/.test(m.version||'')||m.version===currentVersion)return null;
 const next=Number(m.version.slice(4)),current=Number((currentVersion||'').replace(/^web-/,''))||0;
 if(!Number.isSafeInteger(next)||next<=current)return null;
 if(!Number.isFinite(Date.parse(m.expiresAt))||Date.parse(m.expiresAt)<=now)return null;
 // Pin distribution to this repository's immutable release assets. No arbitrary URLs.
 let url;try{url=new URL(m.url);}catch{return null;}
 if(url.protocol!=='https:'||url.hostname!=='github.com'||!url.pathname.startsWith('/figo231/GYMAK/releases/download/web-')||!url.pathname.endsWith('/bundle.zip')||url.search||url.hash)return null;
 if(typeof m.checksum!=='string'||!m.checksum||typeof m.sessionKey!=='string'||!m.sessionKey)return null;
 if(m.checksum.length>8192||m.sessionKey.length>8192)return null;
 return {url:url.href,version:m.version,checksum:m.checksum,sessionKey:m.sessionKey};
}
export async function stageOta({plugin,manifest,identity,storage}){
 const current=await plugin.current();
 const options=validateOtaManifest(manifest,{...identity,currentVersion:current.bundle?.version});
 if(!options)return false;
 const {bundles=[]}=await plugin.list();
 // An errored build stays blocked; don't redownload it in a loop.
 if(bundles.some(b=>b.version===options.version&&b.status==='error'))return false;
 const existing=bundles.find(b=>b.version===options.version&&['pending','success'].includes(b.status));
 const bundle=existing||await plugin.download(options);
 // Do not call next(): its native background/activity lifecycle can interrupt
 // an in-progress session. Record candidate only; activate at next JS bootstrap.
 storage.setItem('gymak_ota_staged_v1',JSON.stringify({id:bundle.id,nativeBuild:identity.nativeBuild}));return true;
}
export async function activateStagedOta({plugin,storage,nativeBuild,canCommit=()=>true}){
 const raw=storage.getItem('gymak_ota_staged_v1');if(!raw)return false;
 storage.removeItem('gymak_ota_staged_v1'); // clear BEFORE reload to prevent loop
 let candidate;try{candidate=JSON.parse(raw);}catch{return false;}
 if(candidate.nativeBuild!==nativeBuild||typeof candidate.id!=='string')return false;
 const {bundles=[]}=await plugin.list();
 if(!bundles.some(b=>b.id===candidate.id&&['pending','success'].includes(b.status)))return false;
 if(!canCommit())return false;
 await plugin.set({id:candidate.id});return true;
}
