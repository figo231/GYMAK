// @vitest-environment node
import {it,expect} from 'vitest';import {translateAuthError} from '../src/lib/authErrors';import {readFileSync} from 'node:fs';
const r=(p)=>readFileSync(p,'utf8');
it('protected route keeps query string and hash in the return path',()=>{expect(r('src/components/ProtectedRoute.jsx')).toContain('location.pathname+location.search+location.hash')});
it('auth screens no longer mention the app developer',()=>{for(const p of ['Login','Register','ForgotPassword'])expect(r(`src/pages/Auth/${p}.jsx`)).not.toContain('مطوّر التطبيق')});
it('register screen visible Arabic text goes through tx()',()=>{const s=r('src/pages/Auth/Register.jsx');expect(s).toContain('import { tx, txf }');
 for(const a of ['تحقق من إيميلك','إنشاء حساب','الباسورد','تأكيد الباسورد','عندك حساب بالفعل؟'])expect(s).toContain(`tx("${a}")`)});
it('generic fetch word no longer matches as a network error',()=>{expect(r('src/lib/authErrors.js')).not.toMatch(/network request\|fetch/)});
it('bottom nav labels translate at render time',()=>{const s=r('src/components/layout/BottomNav.jsx');expect(s).toContain('{tx(item.fallback)}');expect(s).not.toMatch(/fallback: tx\(/)});
it('network failure while online says the server is unreachable, not that the internet is off',()=>{
 const m=translateAuthError(Object.assign(new Error('Failed to fetch'),{name:'AuthRetryableFetchError'}),true);expect(m).toContain('للخادم');expect(m).not.toContain('مفيش اتصال');
 expect(translateAuthError(new TypeError('Failed to fetch'),true)).toContain('للخادم');});
it('really offline still says offline, but a server answer is never hidden by a wrong offline flag',()=>{
 expect(translateAuthError(new TypeError('Failed to fetch'),false)).toContain('مفيش اتصال');
 expect(translateAuthError({message:'Invalid login credentials',status:400},false)).toContain('غلط');});
it('network errors carry a short diagnostic tag so a user can report what happened',()=>{
 expect(translateAuthError(new TypeError('Failed to fetch'),true)).toMatch(/\[net TypeError\]/);
 expect(translateAuthError(new TypeError('x'),false)).toMatch(/\[offline-flag TypeError\]/);
 expect(translateAuthError({message:'Invalid login credentials',status:400},true)).not.toContain('[');});
