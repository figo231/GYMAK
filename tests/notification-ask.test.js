import {describe,it,expect} from 'vitest';
import {shouldAskAgain} from '../src/components/NotificationAsk';
const DAY=24*3600*1000;
describe('first-open notification ask',()=>{
 it('asks on a fresh install',()=>{expect(shouldAskAgain(null)).toBe(true);});
 it('never asks again after an answer (done)',()=>{expect(shouldAskAgain(JSON.stringify({done:true,at:0}),10*DAY)).toBe(false);});
 it('after Not now waits 3 days, and asks at most twice',()=>{
  const at=1000;
  expect(shouldAskAgain(JSON.stringify({n:1,at}),at+DAY)).toBe(false);
  expect(shouldAskAgain(JSON.stringify({n:1,at}),at+3*DAY)).toBe(true);
  expect(shouldAskAgain(JSON.stringify({n:2,at}),at+30*DAY)).toBe(false);
 });
 it('bad stored data does not break the app',()=>{expect(shouldAskAgain('{oops')).toBe(true);});
});
