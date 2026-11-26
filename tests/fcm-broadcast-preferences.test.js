// @vitest-environment node
import {describe,it,expect,vi} from 'vitest';
import {readFileSync} from 'node:fs';
import {transformSync} from 'esbuild';
import vm from 'node:vm';
const source=readFileSync('supabase/functions/_shared/fcmClient.ts','utf8').replace(/^import .*;\n/gm,'').replace(/export /g,'');
function setup(){const sends=[];const rows=[{id:'1',token:'allowed'},{id:'2',token:'blocked'}];const q={select:()=>q,eq:()=>q,order:()=>q,limit:()=>q,then:resolve=>Promise.resolve({data:rows}).then(resolve)};const ctx=vm.createContext({getServiceClient:()=>({from:()=>q}),pushAllowed:async(db,token)=>token==='allowed',Promise,Date,Error});vm.runInContext(transformSync(source,{loader:'ts',format:'esm'}).code+'\nsend=async(target,payload)=>{capture(target,payload);return {ok:true,messageId:"provider"};};globalThis.api={sendToTopic,sendToDeviceToken};',Object.assign(ctx,{capture:(...args)=>sends.push(args)}));return {api:ctx.api,sends};}
describe('broadcast provider boundary actual implementation',()=>{
 it('sends only individually eligible tokens, never an unfiltered topic',async()=>{const {api,sends}=setup();const result=await api.sendToTopic('all_users',{title:'Title',body:'Body'});expect(result.ok).toBe(true);expect(sends).toHaveLength(1);expect(sends[0][0]).toEqual({token:'allowed'});});
 it('rejects unknown topic membership instead of bypassing preferences',async()=>{const {api,sends}=setup();expect((await api.sendToTopic('custom',{})).ok).toBe(false);expect(sends).toHaveLength(0);});
 it('blocks a category opt-out at direct provider boundary',async()=>{const {api,sends}=setup();expect((await api.sendToDeviceToken('blocked',{category:'chat'})).errorCode).toBe('PREFERENCE_DISABLED');expect(sends).toHaveLength(0);});
});
