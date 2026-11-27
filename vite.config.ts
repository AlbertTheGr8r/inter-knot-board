import { defineConfig } from "vite";

// Static output: relative asset URLs so `dist/` works on any host,
// including GitHub Pages subpaths.
export default defineConfig({
  base: "./",
  build: {
    target: "es2022",
    cssTarget: "es2022",
  },
  server: {
    port: 5173,
  },
});
