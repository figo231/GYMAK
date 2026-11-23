import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
const native = vi.hoisted(() => ({ getInfo: vi.fn(), addListener: vi.fn(), open: vi.fn() }));
vi.mock("@capacitor/app", () => ({ App: { getInfo: native.getInfo, addListener: native.addListener } }));
vi.mock("@capacitor/browser", () => ({ Browser: { open: native.open } }));
let strategy;
const release = (tag = "apk-10", extra = {}) => ({ ok: true, json: async () => ({ tag_name: tag, ...extra }) });
beforeEach(async () => {
  vi.resetModules(); localStorage.clear(); vi.clearAllMocks();
  Object.defineProperty(navigator, "onLine", { configurable: true, value: true });
  native.getInfo.mockResolvedValue({ build: "9", version: "1.9" });
  native.addListener.mockResolvedValue({ remove() {} }); native.open.mockResolvedValue();
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(release()));
  strategy = (await import("../src/lib/update/apkUpdateStrategy.js")).apkUpdateStrategy;
});
afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); });
describe("offline APK and data continuity", () => {
  it("keeps the exact legacy HTTPS origin without a remote server dependency", () => {
    const config = JSON.parse(readFileSync("capacitor.config.json", "utf8"));
    expect(config.appId).toBe("com.gymak.app");
    expect(config.server.url).toBeUndefined();
    expect(`${config.server.androidScheme}://${config.server.hostname}`).toBe("https://gymak-eight.vercel.app");
    expect(config.server.cleartext).toBe(false);
    const fallback = readFileSync(`public/${config.server.errorPath}`, "utf8");
    expect(fallback).toContain("location.replace('/')");
    expect(fallback).not.toMatch(/https?:\/\//);
    expect(readdirSync("public/exercises").length).toBeGreaterThan(20);
  });
  it("finds a new build and opens only the fixed download URL", async () => {
    const notify = vi.fn();
    expect(await strategy.checkForUpdate(notify)).toBe(true);
    expect(notify).toHaveBeenCalledWith({ type: "apk-available" });
    expect(strategy.hasPending()).toBe(true);
    await strategy.applyUpdate();
    expect(native.open).toHaveBeenCalledWith({ url: "https://gymak-eight.vercel.app/download/GYMAK.apk" });
  });
  it("never treats an equal or older build as an update", async () => {
    for (const tag of ["apk-9", "apk-8"]) {
      fetch.mockResolvedValue(release(tag));
      expect(await strategy.checkForUpdate(vi.fn())).toBe(false);
      expect(strategy.hasPending()).toBe(false);
    }
  });
  it("does not offer GitHub updates to differently signed Play builds", async () => {
    native.getInfo.mockResolvedValue({ build: "1", version: "1.0-play" });
    expect(await strategy.checkForUpdate(vi.fn())).toBe(false);
    expect(fetch).not.toHaveBeenCalled();
  });
  it("rejects unexpected tags, draft releases and prereleases", async () => {
    for (const row of [["unrelated-apk-99", {}], ["apk-11", { draft: true }], ["apk-12", { prerelease: true }]]) {
      fetch.mockResolvedValue(release(...row));
      await expect(strategy.checkForUpdate(vi.fn())).rejects.toThrow("invalid-release");
    }
  });
  it("skips offline requests and never reports a failed check as current", async () => {
    Object.defineProperty(navigator, "onLine", { configurable: true, value: false });
    const notify = vi.fn();
    await expect(strategy.checkForUpdate(notify)).rejects.toThrow("offline");
    expect(fetch).not.toHaveBeenCalled();
    expect(notify).not.toHaveBeenCalledWith({ type: "none" });
    await expect(strategy.applyUpdate()).rejects.toThrow("offline");
    expect(native.open).not.toHaveBeenCalled();
  });
  it("leaves local records and photos unrelated to update checks untouched", async () => {
    localStorage.setItem("gymak_state_v1", "unchanged-workout-data");
    fetch.mockRejectedValue(new Error("network failure"));
    await expect(strategy.checkForUpdate(vi.fn())).rejects.toThrow("network failure");
    expect(localStorage.getItem("gymak_state_v1")).toBe("unchanged-workout-data");
  });
  it("bounds a hanging release request", async () => {
    vi.useFakeTimers(); fetch.mockImplementation(() => new Promise(() => {}));
    const result = strategy.checkForUpdate(vi.fn()).catch((e) => e.message);
    await vi.advanceTimersByTimeAsync(8001);
    expect(await result).toBe("update-timeout");
  });
  it("checks on reconnect and foreground, with deduplication and one prompt per build", async () => {
    Object.defineProperty(navigator, "onLine", { configurable: true, value: false });
    const notify = vi.fn(); strategy.init(notify);
    expect(fetch).not.toHaveBeenCalled();
    Object.defineProperty(navigator, "onLine", { configurable: true, value: true });
    window.dispatchEvent(new Event("online"));
    await vi.waitFor(() => expect(notify).toHaveBeenCalledTimes(1));
    window.dispatchEvent(new Event("online"));
    expect(fetch).toHaveBeenCalledTimes(1);
    await vi.waitFor(() => expect(native.addListener).toHaveBeenCalled());
    const callback = native.addListener.mock.calls[0][1]; callback({ isActive: true });
    expect(fetch).toHaveBeenCalledTimes(1);
  });
});
