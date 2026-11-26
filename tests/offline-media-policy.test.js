import {describe,it,expect} from 'vitest';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
describe('offline and native configuration policy',()=>{
 it('precaches local WebP art and does not activate updates unconditionally',()=>{const config=read('vite.config.js');expect(config).toContain('svg,webp');expect(config).toContain('skipWaiting: false');expect(config).toContain('registerType: "prompt"');});
 it('requires explicit native Firebase setup and enables it in configured builds',()=>{expect(read('src/lib/push/pushService.js')).toContain('import.meta.env.VITE_PUSH_ENABLED === "true"');expect(read('.github/workflows/android-play.yml')).toContain('VITE_PUSH_ENABLED: "true"');expect(read('.github/workflows/android-apk.yml')).toContain('VITE_PUSH_ENABLED=false');});
 it('keeps workout form backgrounds on theme tokens',()=>{expect(read('src/pages/Workout/workoutPlayer.css')).not.toContain('--bg-card');});
});
