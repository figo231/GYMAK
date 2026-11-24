import {describe,it,expect} from 'vitest';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
describe('browser entry stays on web',()=>{
 it('serves the original promo landing at the existing promotion link',()=>{
  const v=JSON.parse(read('vercel.json'));
  expect(v.rewrites.find(r=>r.source==='/welcome').destination).toBe('/landing.html');
 });
 it('downloads Android as a file and keeps it out of app navigation',()=>{
  const landing=read('public/landing.html');
  expect(landing).toContain('href="/download/GYMAK.apk" download="GYMAK.apk"');
  expect(read('vite.config.js')).toContain('/^\\/download\\//');
 });
 it('does not select APK updates from a browser referrer',()=>{
  const s=read('src/lib/update/UpdateService.js');
  expect(s).not.toContain('android-app://');
  expect(s).toContain('return isNativeApp() ? apkUpdateStrategy : pwaUpdateStrategy');
 });
 it('guards the Android prompt outside the native app',()=>{
  expect(read('src/components/ApkUpdateSheet.jsx')).toContain('UpdateService.platform() !== "apk"');
 });
});
