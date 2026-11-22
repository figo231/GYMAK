import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./styles/global.css";
import "./styles/pro.css";
import "./styles/athletic.css";

document.documentElement.classList.add("pro-ui");
// Volt (athletic) look. Opt in/out with ?ui=ath or ?ui=classic; the choice is remembered on this device.
try {
  const q = new URLSearchParams(window.location.search).get("ui");
  if (q === "ath" || q === "classic") localStorage.setItem("gymak_ui", q);
  const a = new URLSearchParams(window.location.search).get("accent");
  if (["volt","ember","blue","red","purple","gold","teal"].includes(a)) localStorage.setItem("gymak_accent", a);
  if (localStorage.getItem("gymak_ui") === "ath") document.documentElement.classList.add("ath");
  const acc = localStorage.getItem("gymak_accent");
  if (["ember","blue","red","purple","gold","teal"].includes(acc)) document.documentElement.setAttribute("data-accent", acc);
} catch { /* storage unavailable: keep the classic look */ }

import("./lib/push/pushService").then((m) => m.initBroadcastPush()).catch(() => {});

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

import("./lib/content/remoteContent").then((m) => m.refreshRemoteContent()).catch(() => {});
