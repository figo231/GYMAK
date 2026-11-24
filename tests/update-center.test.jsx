import {describe,it,expect,vi} from 'vitest';
import {renderToStaticMarkup} from 'react-dom/server';
import {readFileSync} from 'node:fs';
import {APK25_NOTES} from '../src/lib/update/releaseNotes';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
describe('update center',()=>{
 it('separates downloading from installation and preserves data',()=>{const s=read('src/components/ApkUpdateSheet.jsx');expect(s).toContain('Download');expect(s).toContain('Do not uninstall.');expect(s).toContain('Installed version');expect(s).toContain('visibilitychange');});
 it('reads native installed version instead of inventing an app build',()=>{const s=read('src/lib/update/apkUpdateStrategy.js');expect(s).toContain('await App.getInfo()');expect(s).toContain('async details()');expect(s).toContain('installed = await installedInfo()');});
 it('provides both language changelog entries',()=>{expect(APK25_NOTES.ar).toHaveLength(5);expect(APK25_NOTES.en).toHaveLength(5);});
 it('uses theme surfaces in both modes',()=>{expect(read('src/components/updateCenter.css')).toContain('background:var(--bg-deep-2)');});
});
