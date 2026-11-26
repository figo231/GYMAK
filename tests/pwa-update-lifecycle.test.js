import {describe,it,expect,vi,beforeEach,afterEach} from 'vitest';
const mock=vi.hoisted(()=>({workbox:null}));
vi.mock('workbox-window',()=>({Workbox:class {
 constructor(){this.listeners={};this.messageSkipWaiting=vi.fn();mock.workbox=this;}
 addEventListener(n,f){this.listeners[n]=f;}
 register(){return Promise.resolve(mock.registration);}
}}));
let strategy,notify;
async function flush(){await Promise.resolve();await Promise.resolve();await Promise.resolve();}
beforeEach(async()=>{
 vi.useFakeTimers();vi.resetModules();localStorage.clear();sessionStorage.clear();
 mock.registration=Object.assign(new EventTarget(),{waiting:null,installing:null,update:vi.fn().mockResolvedValue(undefined)});
 Object.defineProperty(navigator,'serviceWorker',{configurable:true,value:Object.assign(new EventTarget(),{controller:{}})});
 strategy=(await import('../src/lib/update/pwaUpdateStrategy')).pwaUpdateStrategy;notify=vi.fn();
});
afterEach(()=>{strategy.__cleanup?.();vi.clearAllTimers();vi.useRealTimers();localStorage.clear();});
describe('PWA update lifecycle',()=>{
 it('checks on startup and listens for a worker left waiting by an old session',async()=>{
  mock.registration.waiting={state:'installed'};strategy.init(notify);await flush();
  expect(mock.registration.update).toHaveBeenCalled();expect(notify).toHaveBeenCalledWith({type:'available'});
  await vi.advanceTimersByTimeAsync(1200);expect(mock.workbox.messageSkipWaiting).toHaveBeenCalled();
 });
 it('does not activate during an active workout, then retries when completed',async()=>{
  localStorage.setItem('gymak_state_v1',JSON.stringify({workoutSession:{status:'active'}}));
  mock.registration.waiting={};strategy.init(notify);await flush();await vi.advanceTimersByTimeAsync(1500);
  expect(mock.workbox.messageSkipWaiting).not.toHaveBeenCalled();expect(strategy.applyUpdate()).toBe(false);
  localStorage.setItem('gymak_state_v1',JSON.stringify({workoutSession:{status:'completed'}}));
  await vi.advanceTimersByTimeAsync(3500);expect(mock.workbox.messageSkipWaiting).toHaveBeenCalled();
 });
 it('detects a slow installer without falsely reporting no update',async()=>{
  const installer=Object.assign(new EventTarget(),{state:'installing'});mock.registration.installing=installer;
  strategy.init(notify);await flush();const checking=vi.fn();const result=strategy.checkForUpdate(checking);await vi.advanceTimersByTimeAsync(1500);await result;
  expect(checking).toHaveBeenLastCalledWith({type:'checking'});expect(checking).not.toHaveBeenCalledWith({type:'none'});
  mock.registration.waiting={};mock.registration.installing=null;installer.state='installed';installer.dispatchEvent(new Event('statechange'));
  expect(notify).toHaveBeenCalledWith({type:'available'});
 });
 it('handles external updates and retries a failed activation message',async()=>{
  strategy.init(notify);await flush();mock.workbox.messageSkipWaiting.mockRejectedValueOnce(Error('transient'));
  mock.workbox.listeners.externalwaiting();await vi.advanceTimersByTimeAsync(1200);await vi.advanceTimersByTimeAsync(3800);
  expect(mock.workbox.messageSkipWaiting.mock.calls.length).toBeGreaterThanOrEqual(2);
 });
 it('checks again after reconnect and on foreground without wiping data',async()=>{
  localStorage.setItem('preserved-fixture','keep');strategy.init(notify);await flush();
  window.dispatchEvent(new Event('online'));document.dispatchEvent(new Event('visibilitychange'));await flush();
  expect(mock.registration.update.mock.calls.length).toBeGreaterThanOrEqual(2);expect(localStorage.getItem('preserved-fixture')).toBe('keep');
 });
 it('keeps observing later controller changes after first install starts uncontrolled',async()=>{
  navigator.serviceWorker.controller=null;strategy.init(notify);await flush();
  navigator.serviceWorker.dispatchEvent(new Event('controllerchange'));
  // Storage throttle prevents actual navigation, but a pending reload must survive it.
  sessionStorage.setItem('gymak_sw_reload',String(Date.now()));
  navigator.serviceWorker.dispatchEvent(new Event('controllerchange'));
  expect(sessionStorage.getItem('gymak_sw_reload')).not.toBeNull();
 });
 it('reports a real update-check failure',async()=>{
  strategy.init(notify);await flush();mock.registration.update.mockRejectedValue(Error('offline'));
  const n=vi.fn();expect(await strategy.checkForUpdate(n)).toBe(false);expect(n.mock.calls[0][0].type).toBe('error');
 });
});
