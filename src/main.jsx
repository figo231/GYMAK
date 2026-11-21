import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./styles/global.css";
import "./styles/pro.css";

document.documentElement.classList.add("pro-ui");

import("./lib/push/pushService").then((m) => m.initBroadcastPush()).catch(() => {});

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
