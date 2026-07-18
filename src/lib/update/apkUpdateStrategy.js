// Placeholder for the future APK build, selected by UpdateService when the
// app detects it's running inside the TWA (Trusted Web Activity) wrapper
// rather than a plain browser tab or installed PWA.
//
// When APK auto-update ships, this should:
//   1. On init(): read the installed APK's versionCode (exposed via a JS
//      bridge injected by the TWA wrapper, or a value baked into the build).
//   2. On checkForUpdate(): fetch a small /version.json (or hit the Play
//      Store's own update API) and compare against the installed version.
//   3. On applyUpdate(): either deep-link to the Play Store listing, or
//      trigger a direct APK download (e.g. MediaFire/GitHub release URL)
//      matching how GYMAK is currently distributed to testers.
//
// Kept as a no-op today so UpdateService and the Settings screen can call
// into it unconditionally without branching on platform anywhere else —
// swapping this file's internals later won't require touching UI code.
export const apkUpdateStrategy = {
  init(_notify) {
    // No-op until APK auto-update is implemented.
  },

  async checkForUpdate(notify) {
    notify({ type: "none" });
    return false;
  },

  applyUpdate() {
    // No-op until APK auto-update is implemented.
  },
};
