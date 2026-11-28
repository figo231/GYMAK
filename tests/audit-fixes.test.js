import { describe, it, expect } from "vitest";
import { stepFor } from "../src/lib/logLogic";
import { archiveGuestData } from "../src/lib/guestImport";

describe("audit fixes", () => {
  it("lb step is 5 for both English and Arabic unit labels", () => {
    expect(stepFor("weight", "lb")).toBe(5);
    expect(stepFor("weight", "رطل")).toBe(5);
    expect(stepFor("weight", "كجم")).toBe(2.5);
  });
  it("guest archive skips the migration snapshot and its own archive", () => {
    const m = new Map([["gymak_state_v1", "a"], ["gymak_migration_snapshot_v1", "big"], ["gymak_guest_import_archive_v1:u", "old"]]);
    const storage = { get length() { return m.size; }, key: (i) => [...m.keys()][i], getItem: (k) => m.has(k) ? m.get(k) : null, setItem: (k, v) => m.set(k, v) };
    const a = archiveGuestData("u2", storage);
    expect(Object.keys(a.data)).toEqual(["gymak_state_v1"]);
  });
});
