import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "jsdom",
    include: ["tests/**/*.test.js"],
    // the store keeps module-level state (cache), so each test file gets a fresh module graph
    isolate: true,
  },
});
