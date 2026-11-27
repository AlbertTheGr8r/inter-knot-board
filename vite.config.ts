import { defineConfig, type Plugin } from "vite";

/**
 * GitHub Pages cannot set response headers, so the production CSP is injected
 * as a meta tag at build time. It is deliberately not present during `vite
 * dev`, where HMR needs its own websocket connection.
 *
 * Note: `frame-ancestors` is ignored in a <meta> CSP. See docs/DEPLOYMENT.md.
 */
const CONTENT_SECURITY_POLICY = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: https:",
  "font-src 'self'",
  "connect-src 'self'",
  "object-src 'none'",
  "base-uri 'none'",
  "form-action 'none'",
].join("; ");

const cspMeta: Plugin = {
  name: "inter-knot-csp-meta",
  apply: "build",
  transformIndexHtml(html) {
    return {
      html,
      tags: [
        {
          tag: "meta",
          attrs: {
            "http-equiv": "Content-Security-Policy",
            content: CONTENT_SECURITY_POLICY,
          },
          injectTo: "head-prepend",
        },
      ],
    };
  },
};

export default defineConfig({
  // Relative asset URLs work on project Pages and custom domains alike.
  base: "./",
  plugins: [cspMeta],
  build: {
    target: "es2022",
    cssTarget: "es2022",
  },
  server: {
    port: 5173,
  },
});
