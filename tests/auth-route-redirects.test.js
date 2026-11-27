// @vitest-environment node
import {it,expect} from 'vitest';import {readFileSync} from 'node:fs';
const cfg=JSON.parse(readFileSync('vercel.json','utf8'));
const to=(s)=>(cfg.redirects||[]).find(r=>r.source===s);
it('web redirects send old sign-in and download URLs to real pages',()=>{
 expect(to('/sign-in').destination).toBe('/auth/login');
 expect(to('/login').destination).toBe('/auth/login');
 expect(to('/download').destination).toBe('/welcome#dl');
 expect(to('/download/').destination).toBe('/welcome#dl');
 for(const r of cfg.redirects)expect(r.permanent).toBe(false);
});
it('redirects never shadow the APK or version files',()=>{
 for(const r of cfg.redirects)expect(['/download/GYMAK.apk','/download/version.json']).not.toContain(r.source);
 expect(JSON.stringify(cfg.rewrites)).toContain('/welcome');
});
it('app router also maps /sign-in and /login to /auth/login',()=>{
 const s=readFileSync('src/router.jsx','utf8');
 expect(s).toMatch(/path: "\/sign-in", element: <Navigate to="\/auth\/login" replace \/>/);
 expect(s).toMatch(/path: "\/login", element: <Navigate to="\/auth\/login" replace \/>/);
});
it('landing page has the #dl download anchor',()=>{expect(readFileSync('public/landing.html','utf8')).toContain('id="dl"')});
