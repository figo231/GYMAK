import {beforeEach,it,expect,vi} from 'vitest';
vi.mock('../src/lib/reviewBuild',()=>({REVIEW_BACKEND_GATED:false}));
const m=vi.hoisted(()=>({id:'a',rpc:vi.fn()}));
vi.mock('../src/lib/supabaseClient',()=>({supabase:{auth:{getUser:async()=>({data:{user:{id:m.id}}})},rpc:m.rpc}}));
import {changeEncouragement,flushEncouragementStop,stopPending} from '../src/lib/encouragement';
beforeEach(()=>{localStorage.clear();m.id='a';m.rpc.mockReset();});
it('queues failed offline stops and retries with expected account binding',async()=>{m.rpc.mockResolvedValueOnce({error:new Error('offline')});await expect(changeEncouragement('a',false)).rejects.toThrow();expect(stopPending('a')).toBe(true);m.rpc.mockResolvedValue({error:null});await flushEncouragementStop('a');expect(stopPending('a')).toBe(false);expect(m.rpc).toHaveBeenLastCalledWith('set_my_encouragement',{p_enabled:false,p_device_id:null,p_expected_user:'a'})});
it('never flushes another account stop under a switched session',async()=>{localStorage.setItem('gymak_encouragement_stop_v1:a','1');m.id='b';await expect(flushEncouragementStop('a')).rejects.toThrow('session_changed');expect(m.rpc).not.toHaveBeenCalled();expect(stopPending('a')).toBe(true)});
