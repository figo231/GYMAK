import { describe, it, expect } from "vitest";
import { SLIDES } from "../src/components/onboardingSlides";
describe("onboarding slides", () => {
  it("covers every main screen", () => {
    const titles = SLIDES.map((s) => s.title).join("|");
    for (const t of ["الرئيسية", "تدريب", "أكل", "تقدم", "حسابي"]) expect(titles).toContain(t);
  });
  it("each slide has title, desc, icon", () => { for (const s of SLIDES) { expect(s.title && s.desc && s.icon).toBeTruthy(); expect(s.desc.length).toBeLessThan(260); } });
});
