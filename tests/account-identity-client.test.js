vi.mock('../src/lib/reviewBuild',()=>({REVIEW_BACKEND_GATED:false}));
import {beforeEach,it,expect,vi} from 'vitest';
const m=vi.hoisted(()=>({id:'a',rpc:vi.fn()}));
vi.mock('../src/lib/supabaseClient',()=>({supabase:{auth:{getUser:async()=>({data:{user:{id:m.id}}})},rpc:m.rpc}}));
import {saveIdentity,skipIdentity,validateIdentity,normalizeUsername} from '../src/lib/accountIdentity';
beforeEach(()=>{m.id='a';m.rpc.mockReset();m.rpc.mockResolvedValue({error:null});});
it('normalizes valid username and binds profile changes to account',async()=>{expect(normalizeUsername('  Name_123 ')).toBe('name_123');await saveIdentity('a',{name:' Test ',gender:'male',username:' Name_123 '});expect(m.rpc).toHaveBeenLastCalledWith('complete_account_identity',{p_name:'Test',p_gender:'male',p_username:'name_123',p_expected_user:'a'});});
it('rejects wrong session before either save or skip',async()=>{m.id='b';await expect(saveIdentity('a',{name:'Test',gender:'male',username:'tester'})).rejects.toThrow('session_changed');await expect(skipIdentity('a')).rejects.toThrow('session_changed');expect(m.rpc).not.toHaveBeenCalled();});
it('validates required values, length and ASCII handle',()=>{expect(validateIdentity({name:'A',gender:'male',username:'valid'})).toBe('invalid_name');expect(validateIdentity({name:'Test',gender:'',username:'valid'})).toBe('invalid_gender');expect(validateIdentity({name:'Test',gender:'female',username:'كريم'})).toBe('invalid_username');expect(validateIdentity({name:'Test',gender:'female',username:'x'.repeat(25)})).toBe('invalid_username');expect(validateIdentity({name:'اسم كريم',gender:'female',username:'kareem_123'})).toBeNull();});
