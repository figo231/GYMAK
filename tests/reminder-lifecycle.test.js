import React,{act} from 'react';
import {createRoot} from 'react-dom/client';
import {afterEach,beforeEach,describe,it,expect,vi} from 'vitest';
const m=vi.hoisted(()=>({auth:{},cancel:vi.fn(),daily:vi.fn(),extra:vi.fn(),smart:vi.fn(),missed:vi.fn(),stop:vi.fn()}));
vi.mock('../src/hooks/useAuth',()=>({useAuth:()=>m.auth}));
vi.mock('../src/lib/store/gymakStore',()=>({default:{getSettings:()=>({notificationsMaster:true,notifEnabled:true,notifTime:'19:00'}),getRawStateForSync:()=>({workoutDays:[]}),getReminderPrefs:()=>({}),getLang:()=> 'ar',trainedOn:()=>false,onChange:()=>m.stop}}));
vi.mock('../src/lib/push/nativeReminder',()=>({isNative:()=>true,cancelAllAppReminders:m.cancel,enableNativeReminder:m.daily,disableNativeReminder:vi.fn(),applyExtraReminders:m.extra,syncMissedReminder:m.missed}));
vi.mock('../src/lib/push/smartReminder',()=>({getSmartReminder:()=>({enabled:true}),syncSmartReminder:m.smart}));
import Lifecycle from '../src/components/NativeReminderLifecycle';
let root,el;
beforeEach(()=>{vi.useFakeTimers();vi.clearAllMocks();m.auth={user:{id:'a'},loading:false,isPasswordRecovery:false,guestImport:{status:'ready',userId:'a'}};localStorage.setItem('gymak_local_data_owner_v1','a');el=document.createElement('div');document.body.append(el);root=createRoot(el);globalThis.IS_REACT_ACT_ENVIRONMENT=true;});
afterEach(async()=>{await act(async()=>root.unmount());el.remove();vi.useRealTimers();});
const settle=()=>act(async()=>{vi.advanceTimersByTime(250);await Promise.resolve();});
describe('native reminder lifecycle',()=>{
 it('schedules for ready account, cancels on logout and never reschedules',async()=>{await act(async()=>root.render(React.createElement(Lifecycle)));await settle();expect(m.daily).toHaveBeenCalledOnce();expect(m.smart).toHaveBeenCalledOnce();m.auth={...m.auth,user:null};await act(async()=>root.render(React.createElement(Lifecycle)));await settle();expect(m.cancel).toHaveBeenCalled();expect(m.daily).toHaveBeenCalledOnce();});
 it('does not schedule during account mismatch',async()=>{m.auth.user={id:'b'};await act(async()=>root.render(React.createElement(Lifecycle)));await settle();expect(m.cancel).toHaveBeenCalled();expect(m.smart).not.toHaveBeenCalled();expect(m.daily).not.toHaveBeenCalled();});
});
