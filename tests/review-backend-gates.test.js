import{it,expect,vi}from'vitest';
vi.mock('../src/lib/reviewBuild',()=>({REVIEW_BACKEND_GATED:true}));
const m=vi.hoisted(()=>({from:vi.fn(),rpc:vi.fn()}));vi.mock('../src/lib/supabaseClient',()=>({supabase:{from:m.from,rpc:m.rpc}}));
import{sendBroadcast}from'../src/lib/push/ownerBroadcast';import{saveIdentity}from'../src/lib/accountIdentity';
it('private test blocks server effects before touching production integrations',async()=>{await expect(sendBroadcast({title:'x',body:'x'})).rejects.toThrow('review_backend_disabled');await expect(saveIdentity('x',{})).rejects.toThrow('review_backend_disabled');expect(m.from).not.toHaveBeenCalled();expect(m.rpc).not.toHaveBeenCalled();});
