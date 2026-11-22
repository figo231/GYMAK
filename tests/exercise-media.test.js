import { describe, it, expect, beforeEach } from "vitest";
import { setAdapter, createMemoryAdapter, saveExerciseMedia, getExerciseMedia, deleteExerciseMedia, mediaKindOf } from "../src/lib/exerciseMedia";

const file = (type, size) => new File([new Uint8Array(size)], "f", { type });

describe("exercise media (local only)", () => {
  beforeEach(() => setAdapter(createMemoryAdapter()));
  it("classifies image/video and rejects others or oversize", () => {
    expect(mediaKindOf(file("image/jpeg", 10))).toBe("image");
    expect(mediaKindOf(file("video/mp4", 10))).toBe("video");
    expect(mediaKindOf(file("application/pdf", 10))).toBe(null);
    expect(mediaKindOf({ type: "video/mp4", size: 31 * 1048576 })).toBe(null);
  });
  it("stores, reads and deletes a video", async () => {
    expect(await saveExerciseMedia("ex-1", file("video/mp4", 50))).toBe("video");
    expect((await getExerciseMedia("ex-1")).kind).toBe("video");
    await deleteExerciseMedia("ex-1");
    expect(await getExerciseMedia("ex-1")).toBe(null);
  });
  it("rejects unsupported files and missing ids", async () => {
    await expect(saveExerciseMedia("ex-1", file("text/plain", 5))).rejects.toThrow();
    await expect(saveExerciseMedia("", file("image/gif", 5))).rejects.toThrow();
  });
  it("keeps gifs untouched", async () => {
    await saveExerciseMedia("ex-g", file("image/gif", 20));
    expect((await getExerciseMedia("ex-g")).blob.size).toBe(20);
  });
});
