/**
 * Crash / error reporting abstraction.
 *
 * NOT wired to any real provider yet (no Firebase Crashlytics, no Sentry —
 * intentionally, per Sprint 6 scope: prepare the architecture, don't
 * integrate a real SDK). This file exists so every place in the app that
 * currently needs to "report" an unexpected error calls ONE function
 * instead of scattering ad hoc console.error calls that would each need
 * to be found and rewired later.
 *
 * ----- Future integration point -----
 * When a real crash reporter is added:
 *   1. Initialize its SDK once, in src/main.jsx, before the app renders
 *      (e.g. `import { init } from "some-sdk"; init({ dsn: ... });`).
 *   2. Replace the body of reportError() below with the real call (e.g.
 *      `Sentry.captureException(error, { extra: context })` or
 *      `crashlytics().recordError(error)`).
 * Nothing else in the codebase needs to change — every call site already
 * goes through this one function.
 *
 * Current call sites: src/components/ErrorBoundary.jsx (render errors).
 * Not wired into gymakStore.js or syncManager.js in this Sprint — Sprint 6
 * explicitly scopes out any change to Store/Sync internals.
 */
export function reportError(error, context = {}) {
  // Intentional no-op in production for now. Logs to console in dev only,
  // matching the project's existing convention (see gymakStore.js,
  // syncManager.js) of dev-visible-only diagnostics with no remote sink.
  if (import.meta.env.DEV) {
    // eslint-disable-next-line no-console
    console.error("[gymak:error]", error, context);
  }
}
