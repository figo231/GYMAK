import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { createRoot } from "react-dom/client";
import { act } from "react-dom/test-utils";
import { createElement } from "react";

// Regression: the body view used to crash with a goal + deadline because the
// trajectory object ({from,to}) was passed to WeightChart as a flat point.
describe("Stats body view with a goal deadline", () => {
  let container, root;
  beforeEach(() => {
    vi.resetModules();
    localStorage.clear();
    const today = new Date();
    const iso = (d) => d.toISOString().slice(0, 10);
    const ago = (n) => { const d = new Date(today); d.setDate(d.getDate() - n); return iso(d); };
    const dl = new Date(today); dl.setDate(dl.getDate() + 45);
    localStorage.setItem("gymak_state_v1", JSON.stringify({
      weightLogs: [28, 21, 14, 7, 0].map((n, i) => ({ date: ago(28 - i * 7), weight: 92 - i * 1.1 })),
      goalWeight: 82,
      goalDeadline: iso(dl),
      workoutDays: [],
      exerciseLogs: {},
      foodLog: [],
      cheatDays: [],
      prHistory: [],
      savedMeals: [],
    }));
    container = document.createElement("div");
    document.body.appendChild(container);
  });
  afterEach(() => { act(() => root.unmount()); container.remove(); });

  it("renders the weight chart with the goal trajectory instead of crashing", async () => {
    const { default: Stats } = await import("../src/pages/Stats/Stats.jsx");
    const { MemoryRouter } = await import("react-router-dom");
    const { ThemeProvider } = await import("../src/hooks/useTheme.jsx");
    const { I18nProvider } = await import("../src/hooks/useI18n.jsx");
    const { ToastProvider } = await import("../src/hooks/useToast.jsx");
    const { DialogProvider } = await import("../src/hooks/useDialog.jsx");
    const { AuthProvider } = await import("../src/hooks/useAuth.jsx");
    root = createRoot(container);
    const tree = createElement(ThemeProvider, null,
      createElement(I18nProvider, null,
        createElement(AuthProvider, null,
          createElement(ToastProvider, null,
            createElement(DialogProvider, null,
              createElement(MemoryRouter, null, createElement(Stats)))))));
    act(() => root.render(tree));
    const bodyBtn = [...container.querySelectorAll("button")].find((b) => (b.textContent || "").trim() === "الجسم");
    expect(bodyBtn).toBeTruthy();
    act(() => bodyBtn.dispatchEvent(new MouseEvent("click", { bubbles: true })));
    expect(container.textContent).not.toContain("مش شغالة");
    expect(container.querySelector(".wchart svg")).toBeTruthy();
  });
});
