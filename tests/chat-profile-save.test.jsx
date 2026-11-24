// @vitest-environment jsdom
import React from 'react';
import {render,screen,fireEvent,waitFor,cleanup} from '@testing-library/react';
import {afterEach,describe,it,expect,vi} from 'vitest';
import {notifyIdentityChanged} from '../src/lib/chatLiveIdentity';
const {save,discover}=vi.hoisted(()=>({save:vi.fn(),discover:vi.fn(async()=>{})}));
vi.mock('react-router-dom',()=>({useParams:()=>({})}));
vi.mock('../src/hooks/useAuth',()=>({useAuth:()=>({user:{id:'self'}})}));
vi.mock('../src/components/layout/DetailShell',()=>({DetailTopBar:()=>null}));
vi.mock('../src/lib/chatIdentity',()=>({getChatProfile:async()=>({display_name:'Original',bio:'',avatar_path:null,visible:true,read_receipts:true}),saveChatProfile:save,chatAvatarUrl:async()=>null,uploadChatAvatar:vi.fn(),discoveryStatus:async()=>({enabled:false,username:'self'}),saveDiscovery:discover}));
import ChatProfile from '../src/pages/Profile/ChatProfile';
afterEach(()=>cleanup());
describe('chat profile save stability',()=>{it('keeps its own form mounted through identity notifications while saving discovery',async()=>{let finish;save.mockImplementation(async()=>notifyIdentityChanged());discover.mockImplementation(()=>new Promise(r=>finish=r));render(<ChatProfile/>);const input=await screen.findByLabelText('الاسم الظاهر');fireEvent.change(input,{target:{value:'Updated'}});fireEvent.submit(input.closest('form'));await waitFor(()=>expect(discover).toHaveBeenCalled());expect(screen.getByLabelText('الاسم الظاهر').value).toBe('Updated');expect(input.isConnected).toBe(true);finish();await screen.findByRole('status');expect(screen.getByLabelText('الاسم الظاهر').value).toBe('Updated');});});
