import { describe, it, expect, beforeEach } from "vitest";
import { fmtClock, remaining, getRestSettings, setRestSettings } from "../src/lib/rest/restTimer";

describe("rest timer helpers", () => {
  beforeEach(() => localStorage.clear());
  it("formats clock", () => { expect(fmtClock(90)).toBe("1:30"); expect(fmtClock(5)).toBe("0:05"); expect(fmtClock(-3)).toBe("0:00"); });
  it("remaining never negative", () => { expect(remaining(1000, 5000)).toBe(0); expect(remaining(10000, 8500)).toBe(2); });
  it("defaults and persists settings", () => {
    expect(getRestSettings()).toEqual({ enabled: true, sec: 90 });
    setRestSettings({ sec: 120 }); expect(getRestSettings().sec).toBe(120);
    setRestSettings({ enabled: false }); expect(getRestSettings()).toEqual({ enabled: false, sec: 120 });
    setRestSettings({ sec: 77 }); expect(getRestSettings().sec).toBe(90);
  });
});
