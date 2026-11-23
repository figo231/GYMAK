import {it,expect,vi} from 'vitest';
import {createPushListenerRegistrar} from '../src/lib/push/registerListeners';
it('installs all receipt handlers once even when startup and sign-in race',async()=>{
 const callbacks={},plugin={addListener:vi.fn(async(name,fn)=>{callbacks[name]=fn;return {remove:vi.fn()}})},register=createPushListenerRegistrar();
 const token=vi.fn(),receive=vi.fn(),tap=vi.fn(),handlers={tokenReceived:token,notificationReceived:receive,notificationActionPerformed:tap};
 await Promise.all([register(plugin,handlers),register(plugin,handlers)]);expect(plugin.addListener).toHaveBeenCalledTimes(3);
 callbacks.notificationReceived({notification:{title:'fixture'}});expect(receive).toHaveBeenCalledOnce();callbacks.notificationActionPerformed({});expect(tap).toHaveBeenCalledOnce();
 await register(plugin,handlers);expect(plugin.addListener).toHaveBeenCalledTimes(3);
});
it('removes partial listeners and allows retry after registration failure',async()=>{
 const remove=vi.fn(),plugin={addListener:vi.fn().mockResolvedValueOnce({remove}).mockRejectedValueOnce(Error('native failed'))},register=createPushListenerRegistrar();
 await expect(register(plugin,{})).rejects.toThrow('native failed');expect(remove).toHaveBeenCalledOnce();plugin.addListener.mockResolvedValue({remove});await register(plugin,{});expect(plugin.addListener).toHaveBeenCalledTimes(5);
});
