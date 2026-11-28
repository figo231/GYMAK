import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

// Mirrors the original manifest.json / sw.js precache behavior 1:1,
// now generated automatically instead of hand-maintained per deploy.
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "prompt",
      // We call registerSW() ourselves (via the virtual:pwa-register module,
      // in src/components/PWAUpdatePrompt.jsx) so we can drive an
      // update-available toast and force periodic update checks — instead of
      // relying on the default auto-injected registration script — so turn
      // that off here to avoid double-registering.
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
        // Brand palette: neon lime #D7FF2F / white / dark #0B0C0F.
        // Both fields use the dark background rather than the lime accent —
        // an install prompt or Android splash screen tinted bright lime would
        // clash with the icon itself, which is dark with a lime/white mark on
        // top of it. Matching the icon's own background keeps the splash
        // transition seamless instead of introducing a flash of accent color.
        background_color: "#0B0C0F",
        theme_color: "#0B0C0F",
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
        globPatterns: ["**/*.{js,css,html,woff2,png,ico,svg,webp}"],
        // The original was a multi-page app where every .html file was
        // individually precached and network-first. This is now a single-page
        // app, so a hard refresh or deep link (e.g. /exercises) while offline
        // needs to fall back to the app shell instead of failing outright.
        navigateFallback: "/index.html",
        navigateFallbackDenylist: [/^\/download\//, /^\/ota\//, /^\/api\//, /^\/landing\.html/, /^\/privacy\.html/, /^\/welcome/],
        // Explicit (not just implied by registerType) so this holds regardless
        // of plugin defaults: a new SW takes over immediately instead of
        // sitting "waiting" until every open tab/PWA instance is closed, and
        // every stale precache from a previous deploy is deleted right after.
        skipWaiting: false,
        clientsClaim: true,
        cleanupOutdatedCaches: true,
        ignoreURLParametersMatching: [/^utm_/, /^fbclid$/, /^art$/],
        // All locally bundled exercise poses are core offline content.
        // Precache them during installation, including never-opened exercises.
        runtimeCaching: [
          {
            urlPattern: /\/exercises\/[\w-]+\/\d\.webp$/,
            handler: "CacheFirst",
            options: {
              cacheName: "exercise-frames-studio-v2",
              expiration: { maxEntries: 300, maxAgeSeconds: 60 * 60 * 24 * 365 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },

        ],
      },
    }),
  ],
});
