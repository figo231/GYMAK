import {describe,it,expect} from 'vitest';
import {readFileSync} from 'node:fs';
describe('reminder battery hint',()=>{
 const src=readFileSync('src/pages/Profile/SmartReminderPreference.jsx','utf8');
 it('shows a bilingual unrestricted-battery hint only on the native app',()=>{
  expect(src).toMatch(/\{native&&<p[^>]*data-testid="battery-hint"/);
  expect(src).toContain('Unrestricted');
  expect(src).toContain('بدون قيود');
 });
});
