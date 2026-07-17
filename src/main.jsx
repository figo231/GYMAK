import React from "react";
import ReactDOM from "react-dom/client";
import { registerSW } from "virtual:pwa-register";
import App from "./App";
import "./styles/global.css";

// Explicit registration (matches the original's visible
// navigator.serviceWorker.register("sw.js") call on every page) instead of
// relying on vite-plugin-pwa's auto-injected script. registerType: "autoUpdate"
// in vite.config.js means new versions activate silently — no update prompt UI
// needed, but onRegisterError is logged so a failed registration isn't silent.
registerSW({
  immediate: true,
  onRegisterError(error) {
    // eslint-disable-next-line no-console
    console.error("[gymak] service worker registration failed:", error);
  },
});

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
