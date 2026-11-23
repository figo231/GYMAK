import {it,expect,vi,afterEach} from 'vitest';
import {bootWithOta} from '../src/lib/update/otaBootstrap';
afterEach(()=>vi.useRealTimers());
it('renders the app once when plugin fails',async()=>{const render=vi.fn();await bootWithOta({render,activate:async()=>{throw Error('offline')}});expect(render).toHaveBeenCalledTimes(1)});
it('late discovery cannot commit after the UI was released',async()=>{vi.useFakeTimers();let release;const render=vi.fn(),commit=vi.fn();const p=bootWithOta({render,timeoutMs:100,activate:async permit=>{await new Promise(r=>release=r);if(!permit())return false;commit();return true;}});await vi.advanceTimersByTimeAsync(101);expect(render).toHaveBeenCalledTimes(1);release();await p;expect(commit).not.toHaveBeenCalled();expect(render).toHaveBeenCalledTimes(1)});
