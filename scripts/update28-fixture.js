export {fetchNativeOtaEnvelope} from '../src/lib/update/otaTransport';
export {verifyOtaEnvelope} from '../src/lib/update/otaManifest';
export {OTA_MANIFEST_PUBLIC_KEY} from '../src/lib/update/otaTrust';
import {createOtaFlow} from '../src/lib/update/otaFlow';
export {createOtaFlow};

import React from 'react';
import {createRoot} from 'react-dom/client';
import {OtaPromptView} from '../src/components/NativeOtaPrompt';
export function mountFlowProbe(options={}){let element=document.createElement('div');element.id='native-ota-ui-probe';document.body.appendChild(element);const root=createRoot(element);let flow;flow=createOtaFlow({...options,publish:state=>{window.__flowState=state;root.render(['checking','downloading'].includes(state.phase)?React.createElement(OtaPromptView,{state,onContinue:()=>flow.continueInBackground()}):null);}});window.__testFlow=flow;flow.start();return flow;}
import {verifyOtaEnvelope} from '../src/lib/update/otaManifest';
import {OTA_MANIFEST_PUBLIC_KEY} from '../src/lib/update/otaTrust';
import {stageOta} from '../src/lib/update/otaPolicy';
import {hasActiveWorkout} from '../src/lib/update/workoutUpdateGuard';
import {CapacitorUpdater} from '@capgo/capacitor-updater';
export async function mountSignedNativeProbe(envelope,nativeBuild){return mountFlowProbe({check:async()=>verifyOtaEnvelope(envelope,OTA_MANIFEST_PUBLIC_KEY),stage:async manifest=>{if(!await stageOta({plugin:CapacitorUpdater,manifest,identity:{nativeBuild,channel:'sideload'},storage:localStorage}))throw Error('not_staged');},activate:async canCommit=>{const {activateStagedOta}=await import('../src/lib/update/otaPolicy');return activateStagedOta({plugin:CapacitorUpdater,storage:localStorage,nativeBuild,canCommit});},isTraining:()=>hasActiveWorkout()});}
