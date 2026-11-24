(() => {
  // src/lib/update/otaManifest.js
  async function verifyOtaEnvelope(envelope, spkiPem, cryptoApi = globalThis.crypto) {
    if (!envelope || typeof envelope.payload !== "string" || typeof envelope.signature !== "string" || envelope.payload.length > 32768 || envelope.signature.length > 2048) throw Error("invalid_envelope");
    const bytes = (s) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
    const der = bytes(spkiPem.replace(/-----[^-]+-----|\s/g, ""));
    const key = await cryptoApi.subtle.importKey("spki", der, { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["verify"]);
    const payload = bytes(envelope.payload);
    if (!await cryptoApi.subtle.verify("RSASSA-PKCS1-v1_5", key, bytes(envelope.signature), payload)) throw Error("manifest_signature");
    return JSON.parse(new TextDecoder().decode(payload));
  }

  // src/lib/update/otaPolicy.js
  function validateOtaManifest(m, { nativeBuild, channel, currentVersion, now = Date.now() }) {
    if (!m || m.schema !== 1 || m.enabled !== true || m.channel !== channel) return null;
    if (!Number.isInteger(m.nativeBuild) || m.nativeBuild !== nativeBuild) return null;
    if (!/^web-[1-9]\d*$/.test(m.version || "") || m.version === currentVersion) return null;
    const next = Number(m.version.slice(4)), current = Number((currentVersion || "").replace(/^web-/, "")) || 0;
    if (!Number.isSafeInteger(next) || next <= current) return null;
    if (!Number.isFinite(Date.parse(m.expiresAt)) || Date.parse(m.expiresAt) <= now) return null;
    let url;
    try {
      url = new URL(m.url);
    } catch {
      return null;
    }
    if (url.protocol !== "https:" || url.hostname !== "github.com" || !url.pathname.startsWith("/figo231/GYMAK/releases/download/web-") || !url.pathname.endsWith("/bundle.zip") || url.search || url.hash) return null;
    if (typeof m.checksum !== "string" || !m.checksum || typeof m.sessionKey !== "string" || !m.sessionKey) return null;
    if (m.checksum.length > 8192 || m.sessionKey.length > 8192) return null;
    return { url: url.href, version: m.version, checksum: m.checksum, sessionKey: m.sessionKey };
  }
  async function stageOta({ plugin, manifest, identity, storage }) {
    const current = await plugin.current();
    const options = validateOtaManifest(manifest, { ...identity, currentVersion: current.bundle?.version });
    if (!options) return false;
    const { bundles = [] } = await plugin.list();
    if (bundles.some((b) => b.version === options.version && b.status === "error")) return false;
    const existing = bundles.find((b) => b.version === options.version && ["pending", "success"].includes(b.status));
    const bundle = existing || await plugin.download(options);
    storage.setItem("gymak_ota_staged_v1", JSON.stringify({ id: bundle.id, nativeBuild: identity.nativeBuild }));
    return true;
  }

  // ../ota-harness-entry.js
  window.__fixtureStage = async (envelope, key, build) => {
    const manifest = await verifyOtaEnvelope(envelope, key);
    const plugin = Object.fromEntries(["current", "list", "download"].map((method) => [method, (options = {}) => window.Capacitor.nativePromise("CapacitorUpdater", method, options)]));
    return stageOta({ plugin, manifest, identity: { nativeBuild: build, channel: "sideload" }, storage: localStorage });
  };
})();
