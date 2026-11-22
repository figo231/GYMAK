import { describe, it, expect, beforeEach } from "vitest";
import { localISO, shiftISO, windowStart } from "../src/lib/dateKey";
import { arDate, capPct, fmtVolume, signed, weightTone, timeFractions } from "../src/lib/stats/format";

describe("date keys", () => {
  it("shifts by whole calendar days regardless of timezone", () => {
    expect(shiftISO("2026-11-22", -1)).toBe("2026-11-21");
    expect(shiftISO("2026-03-01", -1)).toBe("2026-02-28");
    expect(shiftISO("2026-12-31", 1)).toBe("2027-01-01");
  });
  it("window includes today plus n-1 days", () => {
    expect(windowStart("2026-11-22", 7)).toBe("2026-11-16");
    expect(windowStart("2026-11-22", 1)).toBe("2026-11-22");
  });
  it("localISO uses the local calendar day", () => {
    expect(localISO(new Date(2026, 10, 22, 0, 30))).toBe("2026-11-22");
    expect(localISO(new Date(2026, 10, 22, 23, 59))).toBe("2026-11-22");
  });
});

describe("stats formatting", () => {
  it("formats dates in Arabic", () => { expect(arDate("2026-11-20")).toBe("20 نوفمبر"); });
  it("volume switches to tons over 10,000 kg", () => {
    expect(fmtVolume(8260)).toBe("8,260 كجم");
    expect(fmtVolume(10300)).toBe("10.3 طن");
    expect(fmtVolume(12000, "lb")).toBe("12,000 lb");
  });
  it("signed numbers", () => { expect(signed(1.5)).toBe("+1.5"); expect(signed(-0.3)).toBe("-0.3"); expect(signed(0)).toBe("0"); expect(signed(null)).toBe("—"); });
  it("caps absurd percentages", () => { expect(capPct(2700)).toBe("+500%+"); expect(capPct(40)).toBe("+40%"); expect(capPct(0)).toBe("0%"); });
  it("weight tone follows the goal", () => {
    expect(weightTone(-2, 90, 80)).toBe("good");
    expect(weightTone(2, 90, 80)).toBe("bad");
    expect(weightTone(2, 70, 80)).toBe("good");
    expect(weightTone(-2, 70, 80)).toBe("bad");
    expect(weightTone(-2, 80, null)).toBe("neutral");
    expect(weightTone(0.5, 80, 80.5)).toBe("good");
  });
  it("time fractions are proportional", () => {
    const f = timeFractions(["2026-11-01", "2026-11-02", "2026-11-11"]);
    expect(f[0]).toBe(0); expect(f[2]).toBe(1); expect(f[1]).toBeCloseTo(0.1);
  });
});
