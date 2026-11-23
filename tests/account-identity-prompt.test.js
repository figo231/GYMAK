vi.mock('../src/lib/reviewBuild',()=>({REVIEW_BACKEND_GATED:false}));
import {beforeEach,afterEach,it,expect,vi} from 'vitest';
import {act,createElement} from 'react';import {createRoot} from 'react-dom/client';
const m=vi.hoisted(()=>({user:{id:'a'},available:vi.fn(),get:vi.fn(),save:vi.fn(),skip:vi.fn(),merge:vi.fn()}));
vi.mock('../src/hooks/useAuth',()=>({useAuth:()=>({user:m.user})}));vi.mock('../src/hooks/useI18n',()=>({useI18n:()=>({lang:'en'})}));
vi.mock('../src/lib/accountIdentity',async original=>({...await original(),identityAvailable:m.available,getIdentity:m.get,saveIdentity:m.save,skipIdentity:m.skip}));vi.mock('../src/lib/store/gymakStore',()=>({default:{mergeProfileFromRemote:m.merge}}));
import Prompt from '../src/components/CompleteIdentityPrompt';
let el,root;beforeEach(()=>{globalThis.IS_REACT_ACT_ENVIRONMENT=true;m.user={id:'a'};m.available.mockResolvedValue(true);for(const f of [m.get,m.save,m.skip,m.merge])f.mockReset();el=document.createElement('div');document.body.append(el);root=createRoot(el);});afterEach(()=>{act(()=>root.unmount());el.remove();});
const render=async()=>act(async()=>root.render(createElement(Prompt)));
it('asks once without showing previous-account local values and skips without mutation',async()=>{m.get.mockResolvedValue(null);m.skip.mockResolvedValue();await render();expect(el.querySelector('[role=dialog]')).toBeTruthy();expect([...el.querySelectorAll('input')].every(x=>x.value==='')).toBe(true);await act(async()=>[...el.querySelectorAll('button')].find(x=>x.textContent==='Skip for now').click());expect(m.skip).toHaveBeenCalledWith('a');expect(m.merge).not.toHaveBeenCalled();expect(el.querySelector('[role=dialog]')).toBeNull();});
it('ignores a lookup which returns after switching accounts',async()=>{let release;m.get.mockImplementationOnce(()=>new Promise(r=>release=r)).mockResolvedValueOnce({completed_at:'done'});await render();m.user={id:'b'};await render();await act(async()=>release(null));expect(el.querySelector('[role=dialog]')).toBeNull();});
it('coordinates encouragement pause while identity lookup and prompt are pending',async()=>{let release;const states=[];const fn=e=>states.push(e.detail.open);window.addEventListener('gymak-identity-prompt',fn);try{m.get.mockImplementation(()=>new Promise(r=>release=r));await render();expect(states.at(-1)).toBe(true);await act(async()=>release({prompted_at:'done'}));expect(states.at(-1)).toBe(false);expect(el.querySelector('[role=dialog]')).toBeNull();}finally{window.removeEventListener('gymak-identity-prompt',fn);}});

it('hides completion while the runtime capability is paused',async()=>{m.available.mockResolvedValue(false);await render();expect(m.get).not.toHaveBeenCalled();expect(el.querySelector('[role=dialog]')).toBeNull();});
