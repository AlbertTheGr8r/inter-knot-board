# Security policy

## Supported versions

The project is a demo at `0.x`. Only the latest commit on `main` is supported.
There is no security SLA and no guaranteed response time.

## Reporting a vulnerability

Please use GitHub's **private vulnerability reporting** from the repository's
Security tab. Do not open a public issue with exploit details.

If private reporting is not available, open a minimal public issue asking for a
private channel, without details, URLs, tokens, or reproduction steps.

Include:

- Affected version/commit and browser.
- The affected surface: UI, feed parsing, dialog rendering, local proxy, build.
- Reproduction steps and impact.
- Whether a token or private feed URL is involved (never paste the secret).

## Threat model

Inter-Knot Board is a static client. The realistic threats are:

1. **Untrusted feed HTML and URLs.** A feed can contain scripts, iframes, event
   handlers, tracking pixels, or hostile links. All article HTML is sanitized
   with DOMPurify before it is stored or rendered. Scripts, styles, forms,
   iframes, event attributes, and unsafe URL schemes are removed. Links open
   with `noopener noreferrer nofollow`, and remote images use a no-referrer
   policy.
2. **A malicious or compromised local proxy.** The proxy sees feed URLs and
   content. It must bind to loopback, require a token, enforce an origin
   allowlist, and block SSRF targets. It is not a hosted service.
3. **Token leakage.** Reader API passwords/tokens are stored in
   `sessionStorage` by default, never in URLs, logs, or the static bundle.
   Persisting a token is an explicit opt-in with a warning.
4. **Dependency compromise.** The build is static, but the bundled JavaScript
   is still code. The lockfile is committed; CI runs `bun audit`, CodeQL and the
   production build.
5. **GitHub Pages limitations.** The repository cannot set response headers.
   The CSP is a meta tag; `frame-ancestors`, HSTS and `X-Frame-Options` are not
   available. A header-capable proxy is required if those are mandatory.

Out of scope: a public multi-tenant proxy, accounts, server-side persistence,
and protecting a user from a compromised browser or extension.

## Security decisions in this repository

- No analytics, telemetry, or third-party scripts.
- Reading state, the mindful timer, open history, and preferences are local to
  the browser. They are not transmitted.
- No public CORS proxy is shipped or recommended.
- Direct feed fetching is credential-free (`credentials: "omit"`). It is
  limited to HTTPS on HTTPS pages, with a 10-second timeout, a 5 MB cap, and a
  content-type check.
- XML entity declarations are rejected before parsing.
- The production CSP is injected at build time (see `vite.config.ts`).
  `connect-src 'self' https:` is intentional: arbitrary HTTPS feeds are the
  feature. Sanitization, not the CSP, protects article HTML.
- The local proxy, when added, must implement the checklist in
  [docs/FEEDS.md](docs/FEEDS.md): loopback bind, SSRF guard on every redirect,
  size/time limits, content-type allowlist, origin allowlist, optional bearer
  token, rate limit, and no full-URL logging.
- `.env`, `reference/`, and personal OPML exports are ignored by git.

## Known limitations

- Direct fetch is subject to CORS. A feed that does not send
  `Access-Control-Allow-Origin` cannot be read by the static site; the app
  reports this and does not bypass it.
- Feed images are hotlinked from their publishers. A publisher can see the
  request (with a no-referrer policy) and can remove or block an image later.
- The meta CSP cannot prevent framing on GitHub Pages.
- Sanitization reduces XSS risk; it does not make arbitrary feed HTML trusted.
- The app runs with the privileges of the page. A malicious browser extension
  is outside the threat model.
- The local proxy is an example, not a hardened internet-facing service.
- The UI SDK is pinned beta software; review its releases before upgrading.

## Dependency policy

- `bun.lock` is committed and CI installs with `--frozen-lockfile`.
- GitHub Actions are pinned to major versions and reviewed when bumped.
- Dependabot covers GitHub Actions. Bun lockfile-v2 support in Dependabot is
  still unreliable, so dependency auditing is handled by the scheduled
  `bun audit` workflow and CodeQL.
- `@ui-sdk/web` is pinned to an exact beta version; upgrades are deliberate.
