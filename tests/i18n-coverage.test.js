import {describe,it,expect} from 'vitest';
import {readFileSync,readdirSync} from 'node:fs';
import {join} from 'node:path';
import {EN} from '../src/lib/i18n/en';
import {EN_EXTRA} from '../src/lib/i18n/enExtra';
const walk=d=>readdirSync(d,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(join(d,e.name)):/\.jsx?$/.test(e.name)?[join(d,e.name)]:[]);
const files=['src/pages','src/components','src/hooks'].flatMap(walk).filter(f=>!/answerEngine/.test(f));
const RE=/\btx\(\s*"((?:[^"\\\n]|\\.)*[\u0600-\u06FF](?:[^"\\\n]|\\.)*)"\s*\)/g;
describe('English coverage of UI strings',()=>{
 it('every literal tx("...") key in pages, components and hooks has an English entry',()=>{
  const missing=[];
  for(const f of files){const src=readFileSync(f,'utf8');for(const m of src.matchAll(RE)){const key=JSON.parse('"'+m[1]+'"');if(!EN[key]&&!EN_EXTRA[key])missing.push(f+': '+key.slice(0,50));}}
  expect(missing).toEqual([]);
 });
 it('extra entries are real English (no Arabic left)',()=>{
  for(const [k,v] of Object.entries(EN_EXTRA))expect(/[\u0600-\u06FF]/.test(v),k).toBe(false);
 });
});
