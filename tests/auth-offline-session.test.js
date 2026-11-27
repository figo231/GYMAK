import React from 'react';
import {createRoot} from 'react-dom/client';
import {act} from 'react';
import {beforeEach,afterEach,it,expect,vi} from 'vitest';
const mocks=vi.hoisted(()=>({session:null,callback:null,start:vi.fn(),stop:vi.fn(),authSignOut:vi.fn(async()=>({error:null})),remove:vi.fn()}));
vi.mock('../src/lib/supabaseClient',()=>({supabase:{auth:{signOut:(...a)=>mocks.authSignOut(...a),getSession:async()=>({data:{session:mocks.session}}),onAuthStateChange:f=>{mocks.callback=f;return {data:{subscription:{unsubscribe(){}}}};}}}}));
vi.mock('../src/lib/sync/syncManager',()=>({syncManager:{start:mocks.start,stop:mocks.stop}}));
vi.mock('../src/lib/push/pushService',()=>({registerForPush:vi.fn(),removePushToken:(...a)=>mocks.remove(...a)}));
vi.mock('../src/lib/push/ownerBroadcast',()=>({isOwnerAdmin:async()=>false}));
vi.mock('../src/lib/appActivity',()=>({recordAppActivity:vi.fn(),resetActivitySession:vi.fn()}));
vi.mock('../src/lib/encouragement',()=>({flushEncouragementStop:async()=>{}}));
import {AuthProvider,useAuth} from '../src/hooks/useAuth';
let root,host,authApi;function Probe(){const a=useAuth();authApi=a;return React.createElement("span",null,JSON.stringify({user:a.user?.id||null,loading:a.loading,guest:a.guestImport.status}));}
beforeEach(()=>{globalThis.IS_REACT_ACT_ENVIRONMENT=true;localStorage.clear();vi.clearAllMocks();host=document.createElement('div');document.body.append(host);root=createRoot(host);});
afterEach(async()=>{await act(async()=>root.unmount());host.remove();});
async function render(session){mocks.session=session;await act(async()=>{root.render(React.createElement(AuthProvider,null,React.createElement(Probe)));await new Promise(r=>setTimeout(r,0));});}
it('restores a cached signed-in session while offline and starts normal sync',async()=>{Object.defineProperty(navigator,'onLine',{configurable:true,value:false});await render({user:{id:'same'}});expect(JSON.parse(host.textContent)).toEqual({user:'same',loading:false,guest:'ready'});expect(mocks.start).toHaveBeenCalledWith('same');});
it('never starts sync for a guest with preserved local history',async()=>{localStorage.setItem('gymak_state_v1','{}');await render(null);expect(localStorage.getItem('gymak_guest_import_pending_v1')).toBeTruthy();expect(mocks.start).not.toHaveBeenCalled();expect(localStorage.getItem('gymak_state_v1')).toBe('{}');});
it('keeps a different accounts cache behind the mismatch gate',async()=>{localStorage.setItem('gymak_local_data_owner_v1','old');await render({user:{id:'new'}});expect(JSON.parse(host.textContent).guest).toBe('accountMismatch');expect(mocks.start).not.toHaveBeenCalled();});
it('signout does not relabel signed-in history as guest',async()=>{await render({user:{id:'same'}});localStorage.setItem('gymak_state_v1','{}');await act(async()=>mocks.callback('SIGNED_OUT',null));expect(localStorage.getItem('gymak_guest_import_pending_v1')).toBeNull();expect(JSON.parse(host.textContent).user).toBe(null);});

it('sign out completes while offline even if the push token cleanup throws',async()=>{Object.defineProperty(navigator,'onLine',{configurable:true,value:false});mocks.remove.mockRejectedValue(new Error('offline'));await render({user:{id:'same'}});let r;await act(async()=>{r=await authApi.signOut();});expect(mocks.remove).toHaveBeenCalledWith({explicit:true});expect(mocks.authSignOut).toHaveBeenCalledOnce();expect(r.error).toBeNull();});
it('sign out completes when push cleanup reports a deferred retry',async()=>{mocks.remove.mockResolvedValue({deferred:true});await render({user:{id:'same'}});let r;await act(async()=>{r=await authApi.signOut();});expect(mocks.authSignOut).toHaveBeenCalledOnce();expect(r.error).toBeNull();});
