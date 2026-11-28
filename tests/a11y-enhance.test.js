// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import { enhanceDom, onKeyDown } from "../src/lib/a11yEnhance";

describe("a11y enhancer", () => {
  it("marks overlays as dialogs, names placeholder-only inputs and makes seg options keyboard reachable", () => {
    document.body.innerHTML = '<div class="modal-backdrop open"><input placeholder="Weight"></div><div class="seg-option active">kg</div>';
    enhanceDom();
    const o = document.querySelector(".modal-backdrop");
    expect(o.getAttribute("role")).toBe("dialog");
    expect(o.getAttribute("aria-modal")).toBe("true");
    expect(document.querySelector("input").getAttribute("aria-label")).toBe("Weight");
    const seg = document.querySelector(".seg-option");
    expect(seg.getAttribute("tabindex")).toBe("0");
    expect(seg.getAttribute("aria-pressed")).toBe("true");
  });
  it("Escape clicks the topmost overlay only; OTA update overlay is left alone", () => {
    document.body.innerHTML = '<div class="sheet-overlay" id="a"></div><div class="sheet-overlay" id="b"></div><div class="modal-backdrop open update-backdrop" id="u"></div>';
    const hits = [];
    document.querySelectorAll("div").forEach((d) => d.addEventListener("click", () => hits.push(d.id)));
    onKeyDown({ key: "Escape", defaultPrevented: false });
    expect(hits).toEqual(["b"]);
  });
  it("Enter activates a focused seg option", () => {
    document.body.innerHTML = '<div class="seg-option" role="button"></div>';
    const el = document.querySelector(".seg-option"); const fn = vi.fn(); el.addEventListener("click", fn);
    onKeyDown({ key: "Enter", target: el, preventDefault() {} });
    expect(fn).toHaveBeenCalled();
  });
});
