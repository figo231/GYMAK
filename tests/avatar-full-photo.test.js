import {describe,it,expect} from 'vitest';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
describe('final written avatar specification',()=>{
 it('centers every cover crop without shape-dependent offsets',()=>{const s=read('src/styles/reorganization.css');expect(s).toContain('object-position:center!important');expect(s).toContain('object-fit:cover!important');expect(read('src/components/AvatarImage.jsx')).not.toContain('onLoad');});
 it('has a neutral professional silhouette when no photo exists',()=>{expect(read('public/avatar-default.svg')).toContain('viewBox="0 0 100 100"');expect(read('src/components/ChatAvatar.jsx')).toContain('/avatar-default.svg');});
 it('does not change the upload or signed-access implementation',()=>{expect(read('src/components/AvatarImage.jsx')).not.toContain('fetch(');});
});
