import {describe,it,expect} from 'vitest';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
describe('shared full-photo avatar contract',()=>{
 it('marks chat portraits for the common constrained style',()=>{expect(read('src/components/ChatAvatar.jsx')).toContain('gymak-avatar');});
 it('covers all photo surfaces without padding or cropping',()=>{
  const css=read('src/styles/reorganization.css');
  for(const selector of ['.gymak-avatar>img','.profile-avatar>img','.p-avatar-ring>img','.avatar-ring>img'])expect(css).toContain(selector);
  for(const rule of ['object-fit:cover!important','object-position:center!important','overflow:hidden!important','padding:0!important;border:0!important'])expect(css).toContain(rule);
 });
 it('pins the three chat sizes independently of image aspect ratio',()=>{
  const css=read('src/styles/reorganization.css');for(const n of [48,42,28])expect(css).toContain(`width:${n}px!important;height:${n}px!important`);
 });
});
