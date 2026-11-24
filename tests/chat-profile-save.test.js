// @vitest-environment jsdom
import React,{act} from 'react';
import {createRoot} from 'react-dom/client';
import {describe,it,expect,vi} from 'vitest';
import {notifyIdentityChanged} from '../src/lib/chatLiveIdentity';
const {save,discover}=vi.hoisted(()=>({save:vi.fn(),discover:vi.fn(async()=>{})}));
vi.mock('react-router-dom',()=>({useParams:()=>({})}));
vi.mock('../src/hooks/useAuth',()=>({useAuth:()=>({user:{id:'self'}})}));
vi.mock('../src/components/layout/DetailShell',()=>({DetailTopBar:()=>null}));
vi.mock('../src/lib/chatIdentity',()=>({getChatProfile:async()=>({display_name:'Original',bio:'',avatar_path:null,visible:true,read_receipts:true}),saveChatProfile:save,chatAvatarUrl:async()=>null,uploadChatAvatar:vi.fn(),discoveryStatus:async()=>({enabled:false,username:'self'}),saveDiscovery:discover}));
import ChatProfile from '../src/pages/Profile/ChatProfile';
globalThis.IS_REACT_ACT_ENVIRONMENT=true;
describe('chat profile save stability',()=>{it('keeps its own form mounted through identity notifications while saving discovery',async()=>{let finish;save.mockImplementation(async()=>notifyIdentityChanged());discover.mockImplementation(()=>new Promise(r=>finish=r));const container=document.createElement('div');document.body.append(container);const root=createRoot(container);await act(async()=>root.render(React.createElement(ChatProfile)));const input=container.querySelector('#chat-name');expect(input.value).toBe('Original');await act(async()=>input.closest('form').dispatchEvent(new Event('submit',{bubbles:true,cancelable:true})));expect(discover).toHaveBeenCalled();expect(container.querySelector('#chat-name')).toBe(input);expect(input.isConnected).toBe(true);await act(async()=>finish());expect(container.querySelector('[role=status]')).not.toBeNull();await act(async()=>root.unmount());container.remove();});});
