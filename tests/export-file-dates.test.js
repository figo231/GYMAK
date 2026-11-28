import {describe,it,expect} from 'vitest';
import {readFileSync} from 'node:fs';
describe('export file names carry the local date',()=>{
 it('csv and json exports in Account and backup use localISO()',()=>{
  const a=readFileSync('src/pages/Auth/Account.jsx','utf8');
  expect(a).toContain('gymak-data-${localISO()}.csv');
  expect(a).toContain('gymak-data-${localISO()}.json');
  expect(readFileSync('src/lib/backup.js','utf8')).toContain('gymak-backup-${localISO()}.json');
 });
});
