// Never let a hung discovery call block the fitness app indefinitely. A timed
// out discovery cannot later commit an update after the UI has been rendered.
export async function bootWithOta({activate,render,timeoutMs=1800}){
 let permitted=true,rendered=false;
 const once=()=>{if(!rendered){rendered=true;render();}};
 const timer=setTimeout(()=>{permitted=false;once();},timeoutMs);
 try{
  const switching=await activate(()=>{if(!permitted)return false;clearTimeout(timer);return true;});
  if(!switching){permitted=false;once();}
 }catch{permitted=false;once();}
 finally{clearTimeout(timer);}
}
