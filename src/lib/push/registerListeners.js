// One registration path for startup and sign-in. A token listener alone must
// never mark notification receipt/tap handlers as installed.
export function createPushListenerRegistrar() {
  let pending;
  return function register(plugin, handlers) {
    if (pending) return pending;
    pending = (async () => {
      const installed = [];
      try {
        for (const name of ['tokenReceived', 'notificationReceived', 'notificationActionPerformed']) {
          installed.push(await plugin.addListener(name, handlers[name]));
        }
      } catch (error) {
        for (const handle of installed) { try { await handle?.remove(); } catch { /* best effort */ } }
        pending = undefined;
        throw error;
      }
    })();
    return pending;
  };
}
