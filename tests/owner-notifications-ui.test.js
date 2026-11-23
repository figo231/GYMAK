import {it,expect,vi,afterEach} from 'vitest';
import {act,createElement} from 'react';import {createRoot} from 'react-dom/client';
const m=vi.hoisted(()=>({enabled:false,rpc:vi.fn(),invoke:vi.fn()}));
vi.mock('../src/lib/supabaseClient',()=>({supabase:{rpc:m.rpc,functions:{invoke:m.invoke}}}));
vi.mock('../src/hooks/useAuth',()=>({useAuth:()=>({user:{id:'owner'}})}));
vi.mock('../src/hooks/useI18n',()=>({useI18n:()=>({lang:'en'})}));
vi.mock('../src/hooks/useTheme',()=>({useTheme:()=>({theme:'light'})}));
import Panel from '../src/pages/Owner/OwnerNotifications';
let root,el;
afterEach(()=>{act(()=>root?.unmount());el?.remove();vi.clearAllMocks()});
async function start(enabled){m.rpc.mockImplementation(async name=>({data:name==='owner_push_users'?{users:[{user_id:'owner',label:'Owner',devices:1}]}:name==='owner_push_history'?[]:name==='owner_push_review'?{campaign_id:'campaign',accounts:1,devices:1,send_enabled:enabled}:{state:'queued'}}));m.invoke.mockResolvedValue({data:{ok:true,attempted:1,accepted_by_fcm:1}});globalThis.IS_REACT_ACT_ENVIRONMENT=true;el=document.createElement('div');document.body.append(el);root=createRoot(el);await act(async()=>root.render(createElement(Panel)));}
async function click(text){await act(async()=>{[...el.querySelectorAll('button')].find(b=>b.textContent===text).click()})}
async function input(id,value){await act(async()=>{const e=el.querySelector(id),setter=Object.getOwnPropertyDescriptor(e.tagName==='TEXTAREA'?HTMLTextAreaElement.prototype:HTMLInputElement.prototype,'value').set;setter.call(e,value);e.dispatchEvent(new Event('input',{bubbles:true}));})}
async function review(){await input('#push-title','Test');await input('#push-body','Only me');await click('Review recipients and message')}
it('explains paused confirmation and gives refresh feedback without sending',async()=>{await start(false);await review();expect(el.textContent).toContain('Sending is paused by the server');expect([...el.querySelectorAll('button')].find(b=>b.textContent==='Sending paused').disabled).toBe(true);await click('Refresh');expect(el.textContent).toContain('History updated');expect(m.invoke).not.toHaveBeenCalled()});
it('returns to compose after confirmation and clears message to avoid duplicates',async()=>{await start(true);await review();await click('Confirm send');expect(m.invoke).toHaveBeenCalledTimes(1);expect(el.querySelector('#push-title').value).toBe('');expect(el.querySelector('#push-body').value).toBe('');expect(el.textContent).toContain('Confirmation completed');expect(el.textContent).not.toContain('Review send');expect(m.invoke).toHaveBeenCalledWith('send-owner-push',{body:{campaign_id:'campaign'}})});
it('keeps review and shows a specific expiry error without invoking send',async()=>{await start(true);await review();m.rpc.mockImplementation(async name=>name==='owner_push_confirm'?{error:{message:'review_expired'}}:{data:[]});await click('Confirm send');expect(el.textContent).toContain('This review expired');expect(el.textContent).toContain('Review send');expect(m.invoke).not.toHaveBeenCalled()});
