import { describe, it, expect } from "vitest";
import { APP_URL, programLink, programIdFromSearch } from "../src/lib/shareLink";
describe("share link", () => {
  it("sends app invites to the install introduction", () => {
    expect(APP_URL).toBe("https://gymak-eight.vercel.app/welcome");
  });
  it("builds and parses", () => {
    expect(programLink("push-pull-legs")).toBe("https://gymak-eight.vercel.app/welcome?p=push-pull-legs");
    expect(programIdFromSearch("?p=push-pull-legs", ["push-pull-legs"])).toBe("push-pull-legs");
  });
  it("rejects unknown or missing ids", () => {
    expect(programIdFromSearch("?p=evil", ["a"])).toBeNull();
    expect(programIdFromSearch("", ["a"])).toBeNull();
  });
});
