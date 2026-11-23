import {verifyOtaEnvelope} from './otaManifest';
import {OTA_MANIFEST_PUBLIC_KEY} from './otaTrust';
import {Capacitor} from '@capacitor/core';
import {App} from '@capacitor/app';
import {stageOta,activateStagedOta} from './otaPolicy';
const MANIFEST='https://gymak-eight.vercel.app/ota/stable.json';
let started=false;
export async function activateOtaBeforeRender(canCommit=()=>true){
 const channel=import.meta.env.VITE_DISTRIBUTION_CHANNEL;
 if(channel==='play'&&import.meta.env.VITE_PLAY_OTA_REVIEW_HOLD!=='false')return false;
 if(!['sideload','play'].includes(channel))return false;
 if(import.meta.env.VITE_OTA_ENABLED!=='true'||!Capacitor.isNativePlatform()||!Capacitor.isPluginAvailable('CapacitorUpdater'))return false;
 const {CapacitorUpdater:plugin}=await import('@capgo/capacitor-updater');
 const info=await App.getInfo();return activateStagedOta({plugin,storage:localStorage,nativeBuild:Number(info.build),canCommit});
}

export async function initializeOta(){
 if(started||!Capacitor.isNativePlatform()||!Capacitor.isPluginAvailable('CapacitorUpdater'))return;
 started=true;
 const {CapacitorUpdater:plugin}=await import('@capgo/capacitor-updater');
 // A mounted App can still contain only Suspense or ErrorBoundary fallback.
 // Confirm a real route is visible before blessing an OTA bundle as healthy.
 const deadline=Date.now()+10000;
 while(Date.now()<deadline){
  if(window.__gymakRenderFailed)return;
  if(document.querySelector('[data-gymak-route-ready]')&&!document.querySelector('.splash-screen'))break;
  await new Promise(resolve=>setTimeout(resolve,100));
 }
 if(window.__gymakRenderFailed||!document.querySelector('[data-gymak-route-ready]'))return;
 await plugin.notifyAppReady();
 // Download is additionally gated at build time until key/rollback QA is complete.
 if(import.meta.env.VITE_OTA_ENABLED!=='true')return;
 const info=await App.getInfo();
 const channel=import.meta.env.VITE_DISTRIBUTION_CHANNEL;
 if(!['sideload','play'].includes(channel))return;
 // Play review remains locked to the shipped bundle unless separately released.
 if(channel==='play'&&import.meta.env.VITE_PLAY_OTA_REVIEW_HOLD!=='false')return;
 setTimeout(async()=>{
  try{
   const res=await fetch(MANIFEST,{cache:'no-store',signal:AbortSignal.timeout(8000)});
   if(!res.ok)return;const manifest=await verifyOtaEnvelope(await res.json(),OTA_MANIFEST_PUBLIC_KEY);
   await stageOta({plugin,manifest,identity:{nativeBuild:Number(info.build),channel},storage:localStorage});
  }catch{/* Offline, invalid, timeout or invalid signature: bundled app stays usable. */}
 },4000);
}
