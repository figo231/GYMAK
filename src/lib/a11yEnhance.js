// Accessibility safety net applied to the whole app DOM, without changing visible UI:
//  - modal overlays get role="dialog" + aria-modal
//  - Escape closes the topmost overlay (by clicking its own backdrop, the same path a tap uses)
//  - inputs that only have a placeholder get it as their accessible name
//  - clickable div/span with a role="button" style class get keyboard activation
export const OVERLAY_SELECTOR = ".modal-backdrop.open, .sheet-overlay, .pc-edit-backdrop, .report-sheet-backdrop, .pc-actions-backdrop, .ds-backdrop";

export function enhanceDom(root = document) {
  root.querySelectorAll(OVERLAY_SELECTOR).forEach((el) => {
    if (!el.hasAttribute("role")) el.setAttribute("role", "dialog");
    if (!el.hasAttribute("aria-modal")) el.setAttribute("aria-modal", "true");
  });
  root.querySelectorAll("input[placeholder]:not([aria-label]):not([aria-labelledby]), textarea[placeholder]:not([aria-label]):not([aria-labelledby])").forEach((el) => {
    const hasLabel = el.id && root.querySelector(`label[for="${CSS.escape(el.id)}"]`);
    if (!hasLabel && !el.closest("label") && el.getAttribute("placeholder")) el.setAttribute("aria-label", el.getAttribute("placeholder"));
  });
  root.querySelectorAll(".seg-option:not([role])").forEach((el) => {
    el.setAttribute("role", "button");
    el.setAttribute("tabindex", "0");
    el.setAttribute("aria-pressed", el.classList.contains("active") ? "true" : "false");
  });
  root.querySelectorAll(".seg-option[role=button]").forEach((el) => el.setAttribute("aria-pressed", el.classList.contains("active") ? "true" : "false"));
}

export function onKeyDown(e, doc = document) {
  if (e.key === "Escape" && !e.defaultPrevented) {
    const all = [...doc.querySelectorAll(OVERLAY_SELECTOR)].filter((el) => !el.classList.contains("update-backdrop"));
    const top = all[all.length - 1];
    if (top) top.click();
    return;
  }
  if ((e.key === "Enter" || e.key === " ") && e.target?.matches?.(".seg-option[role=button]")) {
    e.preventDefault();
    e.target.click();
  }
}

export function installA11yEnhance() {
  if (typeof document === "undefined" || window.__gymakA11y) return;
  window.__gymakA11y = true;
  let queued = false;
  const run = () => { queued = false; try { enhanceDom(); } catch { /* never break the app */ } };
  new MutationObserver(() => { if (!queued) { queued = true; setTimeout(run, 120); } }).observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ["class"] });
  document.addEventListener("keydown", (e) => onKeyDown(e));
  run();
}
