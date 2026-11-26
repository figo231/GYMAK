import {verifyOtaEnvelope} from './otaManifest';
import {OTA_MANIFEST_PUBLIC_KEY} from './otaTrust';
import {Capacitor,registerPlugin} from '@capacitor/core';
const OtaLifecycle=registerPlugin('OtaLifecycle');
import {App} from '@capacitor/app';
import {fetchNativeOtaEnvelope} from './otaTransport';
import {createOtaFlow} from './otaFlow';
import {hasActiveWorkout} from './workoutUpdateGuard';
import {validateOtaManifest} from './otaPolicy';
import {stageOta,activateStagedOta} from './otaPolicy';
let uiState={phase:'idle'};
const listeners=new Set();
let flow;
export function getOtaState(){return uiState;}
export function continueOtaInBackground(){flow?.continueInBackground();}
export function subscribeOta(listener){listeners.add(listener);return()=>listeners.delete(listener);}
function publish(state){uiState=state;listeners.forEach(fn=>fn());}
let started=false;
export async function activateOtaBeforeRender(canCommit=()=>true){
 const channel=import.meta.env.VITE_DISTRIBUTION_CHANNEL;
 if(channel==='play'&&import.meta.env.VITE_PLAY_OTA_REVIEW_HOLD!=='false')return false;
 if(!['sideload','play'].includes(channel))return false;
 if(import.meta.env.VITE_OTA_ENABLED!=='true'||!Capacitor.isNativePlatform()||!Capacitor.isPluginAvailable('CapacitorUpdater'))return false;
 const {CapacitorUpdater:plugin}=await import('@capgo/capacitor-updater');
 if(!Capacitor.isPluginAvailable('OtaLifecycle'))return false;
 const cold=await OtaLifecycle.consumeColdStart();if(!cold.allowed||hasActiveWorkout())return false;
 const info=await App.getInfo();return activateStagedOta({plugin,storage:localStorage,nativeBuild:Number(info.build),canCommit:()=>!hasActiveWorkout()&&canCommit()});
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
  if(document.querySelector('[data-gymak-route-ready]'))break;
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
 const identity={nativeBuild:Number(info.build),channel};
 flow=createOtaFlow({
  publish,isTraining:()=>hasActiveWorkout(),
  check:async()=>{
   const envelope=await fetchNativeOtaEnvelope();
   const manifest=await verifyOtaEnvelope(envelope,OTA_MANIFEST_PUBLIC_KEY);
   const current=await plugin.current();
   if(!validateOtaManifest(manifest,{...identity,currentVersion:current.bundle?.version}))return null;
   const {bundles=[]}=await plugin.list();
   if(bundles.some(b=>b.version===manifest.version&&b.status==='error'))return null;
   return manifest;
  },
  stage:async (manifest,onProgress)=>{const listener=await plugin.addListener('download',event=>{if(event.bundle?.version===manifest.version||!event.bundle?.version)onProgress(event.percent);});try{if(!await stageOta({plugin,manifest,identity,storage:localStorage}))throw Error('ota_not_staged');}finally{await listener.remove();}},
  activate:canCommit=>activateStagedOta({plugin,storage:localStorage,nativeBuild:identity.nativeBuild,canCommit})
 });
 await flow.start();
}
