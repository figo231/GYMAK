vi.mock('../src/lib/sync/privateDraftSync',()=>({capturePrivateDrafts:()=>{},syncPrivateDrafts:async()=>({revisions:0})}));
vi.mock('../src/lib/sync/mutableDomains',()=>({syncMutableDomains:async()=>({dropped:0,conflicts:0})}));
import {beforeEach,afterEach,describe,it,expect,vi} from 'vitest';
const m=vi.hoisted(()=>({listener:null,pull:vi.fn(),push:vi.fn()}));
vi.mock('../src/lib/supabaseClient',()=>({supabase:{}}));
vi.mock('../src/lib/store/gymakStore',()=>({default:{onChange:f=>{m.listener=f;return ()=>{};}}}));
vi.mock('../src/lib/trainingReset',()=>({setTrainingUser:vi.fn(),resumePendingReset:async()=>false,reconcileTrainingGeneration:async()=>false}));
vi.mock('../src/lib/sync/domains',()=>({pushAll:m.push,pullAll:m.pull}));
let manager;
beforeEach(async()=>{vi.resetModules();vi.clearAllMocks();localStorage.clear();localStorage.setItem('gymak_sync_state_v1',JSON.stringify({migratedUserIds:['a','b']}));Object.defineProperty(navigator,'onLine',{configurable:true,value:true});m.push.mockResolvedValue(0);manager=(await import('../src/lib/sync/syncManager')).syncManager;});
afterEach(()=>manager.stop());
describe('sync in-flight safety',()=>{
 it('invalidates a remote response after signout and relogin to same account',async()=>{let finish;m.pull.mockImplementation((user,canApply)=>new Promise(r=>finish=()=>r(canApply()?99:0)));manager.start('a');const run=manager.manualSync();await vi.waitFor(()=>expect(m.pull).toHaveBeenCalled());const guard=m.pull.mock.calls[0][1];expect(guard()).toBe(true);manager.stop();manager.start('a');expect(guard()).toBe(false);finish();await run;});
 it('does not suppress local edits while waiting for remote network response',async()=>{let finish;m.pull.mockImplementation((user,canApply,apply)=>new Promise(r=>finish=()=>{if(canApply())apply(()=>m.listener());r(0);}));manager.start('a');const run=manager.manualSync();await vi.waitFor(()=>expect(m.pull).toHaveBeenCalled());m.listener();expect(manager.pendingChangeCount).toBe(1);expect(m.pull.mock.calls[0][1]()).toBe(false);finish();await run;expect(manager.pendingChangeCount).toBe(1);});
 it('does not pull stale remote data over a local edit during push',async()=>{let finish;m.push.mockImplementation(()=>new Promise(r=>finish=()=>r(0)));manager.start('a');const run=manager.manualSync();await vi.waitFor(()=>expect(m.push).toHaveBeenCalled());m.listener();finish();await run;expect(m.pull).not.toHaveBeenCalled();expect(manager.pendingChangeCount).toBe(1);});
 it('suppresses only the synchronous merge write, not the whole network wait',async()=>{m.pull.mockImplementation(async(user,canApply,apply)=>{expect(canApply()).toBe(true);apply(()=>m.listener());return 0;});manager.start('a');await manager.manualSync();expect(manager.pendingChangeCount).toBe(0);expect(manager.status).toBe('synced');});
});
it('keeps a corrupt sync review journal intact without crashing subscribers',()=>{localStorage.setItem('gymak_mutable_sync_v1:a','broken');expect(()=>manager.start('a')).not.toThrow();expect(manager.getSnapshot().conflictRecoveryError).toBe('sync_journal_corrupt');expect(localStorage.getItem('gymak_mutable_sync_v1:a')).toBe('broken');});
describe('sync offline gate',()=>{
 it('retries by itself when navigator.onLine says offline and no online event follows',async()=>{
  vi.useFakeTimers();
  try{
   manager.start('a');await vi.advanceTimersByTimeAsync(10);m.pull.mockClear();
   Object.defineProperty(navigator,'onLine',{configurable:true,value:false});
   await manager.runSync();expect(manager.getSnapshot().status).toBe('offline');
   Object.defineProperty(navigator,'onLine',{configurable:true,value:true});m.pull.mockResolvedValue(0);
   await vi.advanceTimersByTimeAsync(6000);
   expect(m.pull).toHaveBeenCalled();expect(manager.getSnapshot().status).toBe('synced');
  }finally{vi.useRealTimers();}
 });
});
