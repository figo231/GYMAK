import {it,expect} from 'vitest';
import {readFileSync} from 'node:fs';
it('index.html theme-color equals the manifest dark color',()=>{
 const html=readFileSync('index.html','utf8'),vite=readFileSync('vite.config.js','utf8');
 const meta=html.match(/<meta name="theme-color" content="(#[0-9A-Fa-f]{6})"/)[1].toLowerCase();
 const man=vite.match(/theme_color:\s*"(#[0-9A-Fa-f]{6})"/)[1].toLowerCase();
 expect(meta).toBe(man);expect(man).toBe('#0b0c0f');
});
