// @vitest-environment node
import {describe,it,expect,vi} from 'vitest';
import {createOwnDeviceTest} from '../supabase/functions/test-own-device/handler.ts';
const ID='11111111-1111-4111-8111-111111111111';
function setup({role='super_admin',token={id:'row',token:'private-device-token',user_id:'owner'},allowed=true}={}){
 const q={select:vi.fn().mockReturnThis(),eq:vi.fn().mockReturnThis(),maybeSingle:vi.fn().mockResolvedValue({data:token,error:null})};
 const client={from:vi.fn(()=>q),rpc:vi.fn().mockResolvedValue({data:allowed,error:null})},verify=vi.fn().mockResolvedValue({role,userId:'owner',serviceClient:client}),send=vi.fn().mockResolvedValue({ok:true,messageId:'private-id'});
 return {handler:createOwnDeviceTest(verify,send),q,client,verify,send};
}
const req=(body={device_id:ID,confirm:true})=>new Request('https://example.invalid',{method:'POST',body:JSON.stringify(body)});
describe('single own-device push test',()=>{
 it('requires explicit confirmation and owner role before reading tokens',async()=>{for(const opts of [{role:'sender'},{}]){const x=setup(opts);const r=await x.handler(req(opts.role?undefined:{device_id:ID}));expect(r.status).toBe(opts.role?403:400);expect(x.client.from).not.toHaveBeenCalled();expect(x.send).not.toHaveBeenCalled();}});
 it('binds token lookup to owner AND exact device, never topic',async()=>{const x=setup();const r=await x.handler(req());expect(r.status).toBe(200);expect(x.q.eq.mock.calls).toEqual([['user_id','owner'],['device_id',ID],['is_active',true]]);expect(x.send).toHaveBeenCalledTimes(1);expect(x.send.mock.calls[0][0]).toBe('private-device-token');const b=await r.text();expect(b).not.toContain('private');expect(JSON.parse(b).accepted_by_fcm).toBe(true);});
 it('does not send without registered token or rate-limit claim',async()=>{for(const opts of [{token:null},{allowed:false}]){const x=setup(opts);expect((await x.handler(req())).status).toBe(opts.token===null?404:429);expect(x.send).not.toHaveBeenCalled();}});
 it('handles auth rejection and does not queue retries',async()=>{const x=setup();x.verify.mockRejectedValue({status:401});expect((await x.handler(req())).status).toBe(401);expect(x.send).not.toHaveBeenCalled();});
 it('distinguishes FCM rejection from receipt on phone',async()=>{const x=setup();x.send.mockResolvedValue({ok:false,errorCode:'private-details'});const r=await x.handler(req());expect(r.status).toBe(502);expect(await r.json()).toEqual({ok:false,error:'fcm_rejected'});});
});
