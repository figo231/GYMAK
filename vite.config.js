import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

// Mirrors the original manifest.json / sw.js precache behavior 1:1,
// now generated automatically instead of hand-maintained per deploy.
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      // We call registerSW() ourselves in main.jsx (via the virtual:pwa-register
      // module) for certainty, instead of relying on the default auto-injected
      // registration script — so turn that off here to avoid double-registering.
      injectRegister: false,
      includeAssets: [
        "favicon.ico", "favicon-16x16.png", "favicon-32x32.png", "favicon-48x48.png",
        "apple-touch-icon.png", "icon-192.png", "icon-512.png", "icon-1024.png", "*.woff2",
      ],
      manifest: {
        id: "/",
        name: "GYMAK",
        short_name: "GYMAK",
        description: "تطبيق متابعة تمارين الجيم والوزن والتغذية، بالعربي بالكامل.",
        lang: "ar",
        dir: "rtl",
        start_url: "/",
        scope: "/",
        display: "standalone",
        // Brand palette: neon lime #D7FF2F / white / dark #0B0F12.
        // Both fields use the dark background rather than the lime accent —
        // an install prompt or Android splash screen tinted bright lime would
        // clash with the icon itself, which is dark with a lime/white mark on
        // top of it. Matching the icon's own background keeps the splash
        // transition seamless instead of introducing a flash of accent color.
        background_color: "#0B0F12",
        theme_color: "#0B0F12",
        orientation: "portrait",
        categories: ["health", "fitness", "lifestyle"],
        icons: [
          { src: "icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
          { src: "icon-192.png", sizes: "192x192", type: "image/png", purpose: "maskable" },
          { src: "icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
          { src: "icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
          { src: "icon-1024.png", sizes: "1024x1024", type: "image/png", purpose: "any" },
        ],
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,woff2,png,ico,svg}"],
        // The original was a multi-page app where every .html file was
        // individually precached and network-first. This is now a single-page
        // app, so a hard refresh or deep link (e.g. /exercises) while offline
        // needs to fall back to the app shell instead of failing outright.
        navigateFallback: "/index.html",
        navigateFallbackDenylist: [/^\/api\//],
        cleanupOutdatedCaches: true,
      },
    }),
  ],
});
