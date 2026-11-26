import {beforeEach,describe,expect,it,vi} from 'vitest';
const mocks=vi.hoisted(()=>({native:vi.fn(()=>true),check:vi.fn(),request:vi.fn(),cancel:vi.fn(),schedule:vi.fn()}));
vi.mock('@capacitor/core',()=>({Capacitor:{isNativePlatform:mocks.native}}));
vi.mock('@capacitor/local-notifications',()=>({LocalNotifications:{checkPermissions:mocks.check,requestPermissions:mocks.request,cancel:mocks.cancel,schedule:mocks.schedule}}));
import {getSmartReminder,saveSmartReminder,syncSmartReminder} from '../src/lib/push/smartReminder';
beforeEach(()=>{localStorage.clear();localStorage.setItem('gymak_local_data_owner_v1','a');vi.clearAllMocks();mocks.native.mockReturnValue(true);mocks.check.mockResolvedValue({display:'granted'});mocks.cancel.mockResolvedValue({});mocks.schedule.mockResolvedValue({});});
describe('native local reminders',()=>{
 it('default on and never need network access',async()=>{const network=vi.spyOn(globalThis,'fetch').mockRejectedValue(Error('offline'));expect(getSmartReminder().enabled).toBe(true);const result=await syncSmartReminder([],{prefs:{enabled:true,time:'19:00',weekdays:[0,1,2,3,4,5,6]}});expect(result.enabled).toBe(true);expect(mocks.schedule).toHaveBeenCalledOnce();expect(mocks.schedule.mock.calls[0][0].notifications.every(n=>n.isExactNotification===false)).toBe(true);expect(network).not.toHaveBeenCalled();network.mockRestore();});
 it('does not ask for permission on background refresh',async()=>{mocks.check.mockResolvedValue({display:'prompt'});const x=await syncSmartReminder([],{prefs:{enabled:true,time:'19:00',weekdays:[1]}});expect(x.denied).toBe(true);expect(mocks.request).not.toHaveBeenCalled();expect(mocks.cancel).not.toHaveBeenCalled();});
 it('keeps account choices isolated',()=>{saveSmartReminder({enabled:false,time:'18:00',weekdays:[1]});localStorage.setItem('gymak_local_data_owner_v1','b');expect(getSmartReminder().enabled).toBe(true);});
 it('does not claim browser delivery',async()=>{mocks.native.mockReturnValue(false);expect((await syncSmartReminder([])).supported).toBe(false);expect(mocks.schedule).not.toHaveBeenCalled();});
});
