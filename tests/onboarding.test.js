import { describe, it, expect } from "vitest";
import { SLIDES } from "../src/components/onboardingSlides";
describe("onboarding slides", () => {
  it("covers every main screen", () => {
    const titles = SLIDES.map((s) => s.title).join("|");
    for (const t of ["الرئيسية", "تدريب", "أكل", "تقدم", "حسابي"]) expect(titles).toContain(t);
  });
  it("each slide has title, desc, icon", () => { for (const s of SLIDES) { expect(s.title && s.desc && s.icon).toBeTruthy(); expect(s.desc.length).toBeLessThan(260); } });
});

import { SLIDES_EN } from '../src/components/onboardingSlidesEn';
describe('practical tour',()=>{
 it('keeps both language versions aligned',()=>{
  expect(SLIDES_EN.length).toBe(SLIDES.length);
  for(let i=0;i<SLIDES.length;i++){
   expect(SLIDES[i].items.length).toBe(SLIDES_EN[i].items.length);
   expect(SLIDES_EN[i].title).toBeTruthy();
   expect(SLIDES_EN[i].desc.length).toBeLessThan(260);
  }
 });
 it('includes data safety, chats and replay help',()=>{
  const titles=SLIDES_EN.map(s=>s.title).join('|');
  for(const t of ['Chat','backups','Settings','Come back'])expect(titles).toContain(t);
  expect(SLIDES.filter(s=>s.interactive).length).toBe(2);
 });
});
