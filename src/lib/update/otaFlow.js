// Background discovery/download only. Activation belongs to safe cold bootstrap.
export function createOtaFlow({check,stage,isTraining,publish,setTimer=setTimeout,clearTimer=clearTimeout,timeoutMs=3000}){
 let state={phase:'idle'},started=false,visible=true;
 const emit=next=>{state={...state,...next};publish(state);};
 return {getState:()=>state,continueInBackground(){visible=false;emit({phase:'silent'});},
  async start(){
   if(started)return;started=true;emit({phase:isTraining()?'idle':'checking'});
   const timer=setTimer(()=>{visible=false;emit({phase:'idle'});},timeoutMs);
   try{const manifest=await check();clearTimer(timer);if(!manifest){emit({phase:'idle'});return;}
    emit({phase:visible&&!isTraining()?'downloading':'silent',version:manifest.version,percent:0});
    await stage(manifest,percent=>{if(visible&&!isTraining())emit({phase:'downloading',percent:Math.max(0,Math.min(100,Math.floor(percent)))});});
    emit({phase:'deferred'});
   }catch{clearTimer(timer);emit({phase:'idle'});}
  }
 };
}
