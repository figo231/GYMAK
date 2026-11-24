import {it,expect} from 'vitest';
import {readFileSync} from 'node:fs';
import {webPushSupported} from '../src/lib/push/webPush';
it('requires secure context and supported browser APIs',()=>{expect(webPushSupported({})).toBe(false);expect(webPushSupported({isSecureContext:true,Notification:{},navigator:{serviceWorker:{}},PushManager:{}})).toBe(true);});
it('does not replace the offline service worker or prompt without a gesture',()=>{const code=readFileSync('src/lib/push/webPush.js','utf8');expect(code).toContain("scope:'/push/'");expect(code).toContain("permission==='default'&&prompt");expect(code).toContain("again.data?.user?.id!==userId");expect(code).toContain("platform:'web'");expect(code).toContain('generation!==lifecycle');});
it('worker only opens the same-origin app and avoids duplicate system alerts for visible windows',()=>{const sw=readFileSync('public/firebase-messaging-sw.js','utf8');expect(sw).toContain("if(!visible.length)");expect(sw).toContain("openWindow('/')");expect(sw).not.toContain('deep_link');});
it('leaves web provider config disabled until activation',()=>{expect(JSON.parse(readFileSync('public/push-config.json','utf8')).enabled).toBe(false);});
it('removes only guest skip links without adding a data-destructive login wall',()=>{for(const p of['Login','Register'])expect(readFileSync(`src/pages/Auth/${p}.jsx`,'utf8')).not.toContain('متابعة بدون');expect(readFileSync('src/router.jsx','utf8')).toContain('<ProtectedRoute><TabShell /></ProtectedRoute>');});
