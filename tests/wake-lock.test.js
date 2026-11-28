// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import { act, createElement } from "react";
import { createRoot } from "react-dom/client";
import { useWakeLock } from "../src/hooks/useWakeLock";

function Probe({ on }) { useWakeLock(on); return null; }
async function mount(on) {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  const el = document.createElement("div"); const root = createRoot(el);
  await act(async () => root.render(createElement(Probe, { on })));
  return root;
}

describe("useWakeLock", () => {
  it("requests and releases the screen lock", async () => {
    const release = vi.fn(() => Promise.resolve());
    const request = vi.fn(() => Promise.resolve({ release, released: false }));
    Object.defineProperty(navigator, "wakeLock", { value: { request }, configurable: true });
    const root = await mount(true);
    expect(request).toHaveBeenCalledWith("screen");
    await act(async () => root.unmount());
    expect(release).toHaveBeenCalled();
  });
  it("does nothing when unsupported or inactive", async () => {
    Object.defineProperty(navigator, "wakeLock", { value: undefined, configurable: true });
    const root = await mount(true);
    await act(async () => root.unmount());
    const request = vi.fn();
    Object.defineProperty(navigator, "wakeLock", { value: { request }, configurable: true });
    const r2 = await mount(false);
    expect(request).not.toHaveBeenCalled();
    await act(async () => r2.unmount());
  });
});
