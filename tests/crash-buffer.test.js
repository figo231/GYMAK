import{beforeEach,it,expect}from'vitest';
import{reportError,readCrashBuffer,clearCrashBuffer,installGlobalErrorBuffer}from'../src/lib/crashReporting';
beforeEach(()=>localStorage.clear());
it('keeps errors locally, clipped, newest 20 only',()=>{
 for(let i=0;i<25;i++)reportError(new Error('e'+i+'x'.repeat(1000)),{source:'t'+i});
 const b=readCrashBuffer();
 expect(b.length).toBe(20);
 expect(b[0].source).toBe('t5');
 expect(b[19].source).toBe('t24');
 expect(b[0].message.length).toBeLessThanOrEqual(300);
 expect(b[0].stack.length).toBeLessThanOrEqual(800);
});
it('accepts non-Error values and never throws on broken storage',()=>{
 reportError('plain text');reportError(undefined);
 expect(readCrashBuffer().length).toBe(2);
 localStorage.setItem('gymak_crash_buffer_v1','{not json');
 expect(readCrashBuffer()).toEqual([]);
 const bad={getItem(){throw Error('no')},setItem(){throw Error('no')},removeItem(){throw Error('no')}};
 expect(readCrashBuffer(bad)).toEqual([]);
 expect(clearCrashBuffer(bad)).toBe(false);
});
it('clear empties it and the global hook records window errors once',()=>{
 reportError(new Error('a'));expect(clearCrashBuffer()).toBe(true);expect(readCrashBuffer()).toEqual([]);
 const handlers={};const target={addEventListener:(k,f)=>{handlers[k]=f}};
 expect(installGlobalErrorBuffer(target)).toBe(true);expect(installGlobalErrorBuffer(target)).toBe(false);
 handlers.error({error:new Error('boom')});handlers.unhandledrejection({reason:new Error('rej')});
 expect(readCrashBuffer().map(e=>e.source)).toEqual(['window.error','unhandledrejection']);
});
