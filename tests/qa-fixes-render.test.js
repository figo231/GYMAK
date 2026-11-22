import {describe,it,expect,vi,afterEach} from 'vitest';
import {createElement,act} from 'react';
import {createRoot} from 'react-dom/client';
import {MemoryRouter} from 'react-router-dom';
import {routineDurationLabel} from '../src/lib/warmup';
vi.mock('../src/hooks/useAuth',()=>({useAuth:()=>({user:null})}));
vi.mock('../src/hooks/useToast',()=>({useToast:()=>()=>{}}));
vi.mock('../src/lib/push/ownerBroadcast',()=>({BROADCAST_ENABLED:false}));
vi.mock('../src/lib/push/pushService',()=>({getInbox:()=>[],importDelivered:async()=>{},getPushPermission:async()=>'unsupported',initBroadcastPush:vi.fn(),deleteInboxItem:vi.fn(),clearInbox:vi.fn()}));
let root,el;afterEach(()=>{if(root)act(()=>root.unmount());el?.remove();root=null;localStorage.clear()});
function mount(component){el=document.createElement('div');document.body.append(el);root=createRoot(el);act(()=>root.render(component));}
describe('QA interaction regressions',()=>{
 it('updates joined challenge immediately without reload',async()=>{const {default:Card}=await import('../src/pages/Dashboard/ChallengeCard');mount(createElement(Card,{version:0}));const btn=[...el.querySelectorAll('button')].find(b=>b.textContent==='ابدأ التحدي');act(()=>btn.click());expect(el.textContent).toContain('يوم 1 من 30');expect(el.textContent).not.toContain('ابدأ التحدي');expect(localStorage.getItem('gymak_challenge30_v1')).toBeTruthy()});
 it('restarts expired challenge immediately',async()=>{localStorage.setItem('gymak_challenge30_v1',JSON.stringify({start:'2020-01-01'}));const {default:Card}=await import('../src/pages/Dashboard/ChallengeCard');mount(createElement(Card,{version:0}));act(()=>[...el.querySelectorAll('button')].find(b=>b.textContent==='ابدأ من الأول').click());expect(el.textContent).toContain('يوم 1 من 30');expect(el.textContent).not.toContain('ابدأ من الأول')});
 it('explains unsupported web push and links settings from inbox',async()=>{const {default:Sheet}=await import('../src/pages/Profile/NotifSheet');await act(async()=>mount(createElement(MemoryRouter,null,createElement(Sheet,{onClose:()=>{}}))));expect(el.textContent).toContain('مش المتصفح');expect(el.querySelector('a[href="/notifications"]')).toBeTruthy();expect(el.textContent).toContain('الرسائل الواردة')});
 it('uses correct Arabic duration counts',()=>{for(const [n,label] of [[1,'دقيقة واحدة'],[2,'دقيقتين'],[7,'7 دقايق'],[12,'12 دقيقة']])expect(routineDurationLabel([{sec:n*60}])).toBe(label)});
});
