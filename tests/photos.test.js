import { describe, it, expect, beforeEach } from "vitest";
import { setAdapter, createMemoryAdapter, addPhoto, listPhotos, deletePhoto, compareSet, MAX_PHOTOS } from "../src/lib/photos/photos";

const blob = (n = 3) => new Blob([new Uint8Array(n)], { type: "image/jpeg" });

describe("progress photos (local only)", () => {
  beforeEach(() => setAdapter(createMemoryAdapter()));
  it("adds and lists newest first", async () => {
    await addPhoto(blob(), { date: "2026-01-01", pose: "front" });
    await addPhoto(blob(), { date: "2026-03-01", pose: "front" });
    await addPhoto(blob(), { date: "2026-02-01", pose: "side" });
    const l = await listPhotos();
    expect(l.map((p) => p.date)).toEqual(["2026-03-01", "2026-02-01", "2026-01-01"]);
  });
  it("sanitizes pose and date, rejects empty blobs", async () => {
    const r = await addPhoto(blob(), { date: "bad", pose: "hax" });
    expect(r.pose).toBe("front"); expect(r.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    await expect(addPhoto(new Blob([]))).rejects.toThrow();
  });
  it("deletes", async () => {
    const r = await addPhoto(blob()); await deletePhoto(r.id); expect(await listPhotos()).toHaveLength(0);
  });
  it("compareSet picks oldest vs newest, per pose", async () => {
    await addPhoto(blob(), { date: "2026-01-01", pose: "front" });
    await addPhoto(blob(), { date: "2026-02-01", pose: "side" });
    await addPhoto(blob(), { date: "2026-03-01", pose: "front" });
    const l = await listPhotos();
    expect(compareSet(l, "side")).toBeNull();
    const c = compareSet(l, "front"); expect(c.before.date).toBe("2026-01-01"); expect(c.after.date).toBe("2026-03-01");
    expect(compareSet(l.slice(0, 1))).toBeNull();
  });
  it("enforces a cap", async () => {
    for (let i = 0; i < MAX_PHOTOS; i++) await addPhoto(blob(1), { date: "2026-01-01" });
    await expect(addPhoto(blob())).rejects.toThrow("photo-limit");
  });
});
