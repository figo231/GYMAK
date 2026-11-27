import React from 'react';
import {createRoot} from 'react-dom/client';
import {act} from 'react';
import {beforeEach,afterEach,it,expect,vi} from 'vitest';
const mocks=vi.hoisted(()=>({session:null,callback:null,start:vi.fn(),stop:vi.fn()}));
vi.mock('../src/lib/supabaseClient',()=>({supabase:{auth:{getSession:async()=>({data:{session:mocks.session}}),onAuthStateChange:f=>{mocks.callback=f;return {data:{subscription:{unsubscribe(){}}}};}}}}));
vi.mock('../src/lib/sync/syncManager',()=>({syncManager:{start:mocks.start,stop:mocks.stop}}));
vi.mock('../src/lib/push/pushService',()=>({registerForPush:vi.fn(),removePushToken:vi.fn()}));
vi.mock('../src/lib/push/ownerBroadcast',()=>({isOwnerAdmin:async()=>false}));
vi.mock('../src/lib/appActivity',()=>({recordAppActivity:vi.fn(),resetActivitySession:vi.fn()}));
vi.mock('../src/lib/encouragement',()=>({flushEncouragementStop:async()=>{}}));
import {AuthProvider,useAuth} from '../src/hooks/useAuth';
import {I18nProvider} from '../src/hooks/useI18n';
import GuestImportGate from '../src/components/GuestImportGate';
import {startFreshForAccount} from '../src/lib/accountSwitch';
let root,host;
beforeEach(()=>{globalThis.IS_REACT_ACT_ENVIRONMENT=true;localStorage.clear();vi.clearAllMocks();host=document.createElement('div');document.body.append(host);root=createRoot(host);});
afterEach(async()=>{await act(async()=>root.unmount());host.remove();});
function Probe(){const a=useAuth();return React.createElement('div',null,React.createElement('span',{id:'s'},a.guestImport.status),a.guestImport.status==='ready'?null:React.createElement(GuestImportGate));}
async function render(session){mocks.session=session;await act(async()=>{root.render(React.createElement(I18nProvider,null,React.createElement(AuthProvider,null,React.createElement(Probe))));await new Promise(r=>setTimeout(r,0));});}
const btns=()=>[...host.querySelectorAll('button')].map(b=>b.textContent);
it('mismatch screen shows the explanation, a continue button and a sign-out button',async()=>{
 localStorage.setItem('gymak_local_data_owner_v1','old');localStorage.setItem('gymak_state_v1','{"x":1}');await render({user:{id:'new'}});
 expect(host.querySelector('#s').textContent).toBe('accountMismatch');expect(btns().length).toBe(2);expect(btns()[0]).toContain('كمّل');expect(btns()[1]).toContain('اخرج');
 expect(host.textContent).not.toContain('تأكيد النقل');
});
it('continue button stashes the old data, binds the new account and starts sync',async()=>{
 localStorage.setItem('gymak_local_data_owner_v1','old');localStorage.setItem('gymak_state_v1','{"x":1}');await render({user:{id:'new'}});
 await act(async()=>{[...host.querySelectorAll('button')].find(b=>b.textContent.includes('كمّل')).click();await new Promise(r=>setTimeout(r,0));});
 expect(host.querySelector('#s').textContent).toBe('ready');expect(localStorage.getItem('gymak_local_data_owner_v1')).toBe('new');expect(localStorage.getItem('gymak_state_v1')||'').not.toContain('"x":1');
 expect(mocks.start).toHaveBeenCalledWith('new');
 const k=Object.keys(localStorage).filter(x=>x.startsWith('gymak_account_stash_v1:old:'));expect(k.length).toBe(1);expect(JSON.parse(localStorage.getItem(k[0])).data.gymak_state_v1).toBe('{"x":1}');
});
it('logging into the original account later restores its data automatically',async()=>{
 localStorage.setItem('gymak_local_data_owner_v1','old');localStorage.setItem('gymak_state_v1','{"x":1}');startFreshForAccount('new');localStorage.setItem('gymak_state_v1','{"y":2}');
 await render({user:{id:'old'}});
 expect(host.querySelector('#s').textContent).toBe('ready');expect(localStorage.getItem('gymak_state_v1')).toBe('{"x":1}');expect(localStorage.getItem('gymak_local_data_owner_v1')).toBe('old');expect(mocks.start).toHaveBeenCalledWith('old');
 expect(Object.keys(localStorage).some(x=>x.startsWith('gymak_account_stash_v1:new:'))).toBe(true);
});
it('a third account with no stash still sees the mismatch gate and nothing changes',async()=>{
 localStorage.setItem('gymak_local_data_owner_v1','old');localStorage.setItem('gymak_state_v1','{"x":1}');await render({user:{id:'third'}});
 expect(host.querySelector('#s').textContent).toBe('accountMismatch');expect(localStorage.getItem('gymak_state_v1')).toBe('{"x":1}');expect(mocks.start).not.toHaveBeenCalled();
});
