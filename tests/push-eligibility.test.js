import {describe,it,expect} from 'vitest';
import {pushAllowed} from '../supabase/functions/_shared/pushEligibility.ts';
function db({device={user_id:'u',is_active:true},prefs=[],error=null,prefError=null}={}){return {from:table=>{const q={select:()=>q,eq:()=>q,in:async()=>({data:prefs,error:prefError}),maybeSingle:async()=>({data:device,error})};return q;}};}
describe('final server notification preference check',()=>{
 it('defaults on only for a current active owned token',async()=>{expect(await pushAllowed(db(),'t','chat')).toBe(true);expect(await pushAllowed(db({device:null}),'t','chat')).toBe(false);expect(await pushAllowed(db({device:{user_id:'u',is_active:false}}),'t','chat')).toBe(false);});
 it('honors both master and category off',async()=>{for(const category of ['master','chat'])expect(await pushAllowed(db({prefs:[{category,enabled:false}]}),'t','chat')).toBe(false);});
 it('fails closed on either lookup failure',async()=>{await expect(pushAllowed(db({error:{}}),'t','chat')).rejects.toThrow();await expect(pushAllowed(db({prefError:{}}),'t','chat')).rejects.toThrow();});
});
it('does not send built-in broadcasts through a topic that bypasses account opt-outs',async()=>{const {readFileSync}=await import('node:fs');const code=readFileSync('supabase/functions/_shared/fcmClient.ts','utf8');expect(code).not.toContain('return send({ topic }, payload)');expect(code).toContain('broadcastToAccounts(payload)');expect(code).toContain('pushAllowed(getServiceClient(),token');});
it('checks queued notification cancellation and fails closed on lookup errors',async()=>{const {queuedBroadcastAllowed}=await import('../supabase/functions/_shared/pushEligibility.ts');for(const status of ['canceled','sent','draft',undefined])expect(await queuedBroadcastAllowed(db({device:{status}}),'n')).toBe(false);expect(await queuedBroadcastAllowed(db({device:{status:'sending'}}),'n')).toBe(true);await expect(queuedBroadcastAllowed(db({error:{}}),'n')).rejects.toThrow();});
