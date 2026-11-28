import {it,expect} from 'vitest';
import {readFileSync,readdirSync} from 'node:fs';import {join} from 'node:path';
import {EN} from '../src/lib/i18n/en';import {EN_EXTRA} from '../src/lib/i18n/enExtra';
const walk=d=>readdirSync(d,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(join(d,e.name)):/\.jsx?$/.test(e.name)?[join(d,e.name)]:[]);
it('every literal txf("...") key has an English entry',()=>{const miss=[];
for(const f of ['src/pages','src/components','src/hooks','src/lib'].flatMap(walk).filter(f=>!/answerEngine|i18n\//.test(f))){
 for(const m of readFileSync(f,'utf8').matchAll(/\btxf\(\s*(["'`])((?:(?!\1)[^\\\n]|\\.)*?[\u0600-\u06FF](?:(?!\1)[^\\\n]|\\.)*?)\1/g)){
  const k=m[2].replace(/\\"/g,'"');if(!EN[k]&&!EN_EXTRA[k])miss.push(f+': '+k.slice(0,60));}}
expect(miss).toEqual([]);});
