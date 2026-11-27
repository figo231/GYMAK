import {describe,it,expect} from 'vitest';
import {versionInfo} from '../scripts/prepare-web-apk.mjs';
describe('version.json',()=>{
 it('adds code and name from the apk tag',()=>{expect(versionInfo('apk-29',10,'ab')).toEqual({tag:'apk-29',size:10,sha256:'ab',versionCode:29,versionName:'1.29'})});
 it('keeps old shape for other tags',()=>{expect(versionInfo('web-1',10,'ab')).toEqual({tag:'web-1',size:10,sha256:'ab'})});
});
