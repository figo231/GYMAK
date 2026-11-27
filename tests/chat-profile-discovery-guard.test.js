// @vitest-environment jsdom
import React,{act} from 'react';
import {createRoot} from 'react-dom/client';
import {describe,it,expect,vi,beforeEach} from 'vitest';
const m=vi.hoisted(()=>({save:vi.fn(async()=>{}),discover:vi.fn(async()=>{}),status:vi.fn()}));
vi.mock('react-router-dom',()=>({useParams:()=>({})}));
vi.mock('../src/hooks/useAuth',()=>({useAuth:()=>({user:{id:'self'}})}));
vi.mock('../src/components/layout/DetailShell',()=>({DetailTopBar:()=>null}));
vi.mock('../src/lib/chatIdentity',()=>({getChatProfile:async()=>({display_name:'Original',bio:'',avatar_path:null,visible:true,read_receipts:true}),saveChatProfile:m.save,chatAvatarUrl:async()=>null,uploadChatAvatar:vi.fn(),discoveryStatus:m.status,saveDiscovery:m.discover}));
import ChatProfile from '../src/pages/Profile/ChatProfile';
globalThis.IS_REACT_ACT_ENVIRONMENT=true;
async function mount(){const c=document.createElement('div');document.body.append(c);const root=createRoot(c);await act(async()=>root.render(React.createElement(ChatProfile)));return {c,root};}
const submit=c=>act(async()=>c.querySelector('#chat-name').closest('form').dispatchEvent(new Event('submit',{bubbles:true,cancelable:true})));
beforeEach(()=>{vi.clearAllMocks();});
describe('chat profile: discoverable-by-username is never saved before its status loaded',()=>{
 it('status still loading: shows an error and saves nothing',async()=>{m.status.mockImplementation(()=>new Promise(()=>{}));const {c,root}=await mount();await submit(c);expect(m.discover).not.toHaveBeenCalled();expect(m.save).not.toHaveBeenCalled();expect(c.querySelector('[role=alert]')).not.toBeNull();await act(async()=>root.unmount());c.remove();});
 it('status failed to load: shows an error and saves nothing',async()=>{m.status.mockRejectedValue(new Error('offline'));const {c,root}=await mount();await submit(c);expect(m.discover).not.toHaveBeenCalled();expect(m.save).not.toHaveBeenCalled();expect(c.querySelector('[role=alert]')).not.toBeNull();await act(async()=>root.unmount());c.remove();});
 it('status loaded: saves with the loaded value',async()=>{m.status.mockResolvedValue({enabled:true,username:'self'});const {c,root}=await mount();await submit(c);expect(m.save).toHaveBeenCalledOnce();expect(m.discover).toHaveBeenCalledWith(true);await act(async()=>root.unmount());c.remove();});
});
