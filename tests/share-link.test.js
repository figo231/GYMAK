import { describe, it, expect } from "vitest";
import { programLink, programIdFromSearch } from "../src/lib/shareLink";
describe("share link", () => {
  it("builds and parses", () => {
    expect(programLink("push-pull-legs")).toBe("https://gymak-eight.vercel.app/programs?p=push-pull-legs");
    expect(programIdFromSearch("?p=push-pull-legs", ["push-pull-legs"])).toBe("push-pull-legs");
  });
  it("rejects unknown or missing ids", () => {
    expect(programIdFromSearch("?p=evil", ["a"])).toBeNull();
    expect(programIdFromSearch("", ["a"])).toBeNull();
  });
});
