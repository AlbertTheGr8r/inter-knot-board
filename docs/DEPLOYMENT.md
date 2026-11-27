# Deployment

The site is a static Vite build. The repository ships a GitHub Pages workflow
that builds on every push to `main` and deploys the `dist/` directory.

## GitHub Pages

1. Create the repository and push `main`.
2. In **Settings → Pages**, set **Source** to **GitHub Actions**.
3. Run the `Deploy to GitHub Pages` workflow (or push to `main`).
4. The site is published at:
   `https://albertthegr8r.github.io/inter-knot-board/`

The workflow (`.github/workflows/pages.yml`) uses the official Pages actions:

| Step           | Action                                            |
| -------------- | ------------------------------------------------- |
| Checkout       | `actions/checkout@v6`                             |
| Bun            | `oven-sh/setup-bun@v2` (`1.4.4`)                  |
| Pages metadata | `actions/configure-pages@v5`                      |
| Build          | `bun install --frozen-lockfile` + `bun run check` |
| Artifact       | `actions/upload-pages-artifact@v4` (`dist/`)      |
| Deploy         | `actions/deploy-pages@v4`                         |

Required permissions are scoped to the deploy job: `pages: write` and
`id-token: write`. The build job only needs `contents: read`. The deployment
uses the `github-pages` environment.

## Asset paths

`vite.config.ts` sets `base: "./"`. The generated HTML references assets
relatively, so the same build works at:

- `https://albertthegr8r.github.io/inter-knot-board/`
- a custom domain at the root
- a local `file://`-free preview served by `bun run preview`

If you later switch to absolute paths, set `base` to `/<repo>/` for project
Pages and `/` for a custom domain.

## CSP and headers on Pages

GitHub Pages does not allow custom HTTP response headers. The production build
injects a CSP `<meta>` tag via a Vite plugin (`inter-knot-csp-meta`). The policy
is intentionally narrow:

```
default-src 'self';
script-src 'self';
style-src 'self' 'unsafe-inline';
img-src 'self' data: https:;
font-src 'self';
connect-src 'self';
object-src 'none';
base-uri 'none';
form-action 'none';
```

Why `style-src 'unsafe-inline'`: the poster and card components set CSS custom
properties through `style` attributes. Tightening this requires moving those
values into classes or a stylesheet, which is planned but not done in v0.1.0.

Important limitations:

- `frame-ancestors`, `report-uri`, and `sandbox` are ignored in a `<meta>` CSP.
  Clickjacking protection needs a real header from a proxy/CDN.
- `Strict-Transport-Security`, `X-Frame-Options`, `X-Content-Type-Options`,
  `Referrer-Policy`, and `Permissions-Policy` cannot be set by the repository.
- GitHub Pages does serve HTTPS for `github.io` and supported custom domains.
- If stricter headers are required, put Cloudflare (or another header-capable
  proxy) in front of Pages. That is outside this repository's control.

The CSP is not injected during `vite dev` because HMR needs its own websocket.
Test the production policy with `bun run build && bun run preview` and watch the
browser console for violations.

## Daily use from Pages

The public site is the UI. The local proxy is planned for v0.3.0; once it
exists, it runs on the same machine:

```bash
# After v0.3.0:
LOCAL_API_TOKEN=... bun run tools/local-api/index.ts
```

The page calls `http://127.0.0.1:<port>`. Browsers treat loopback as a
potentially trustworthy origin, but this must be verified in the browsers you
use. If a browser blocks the request from an HTTPS page, run the app locally
(`bun run dev`) for that session instead. The proxy is never deployed to Pages.

## Custom domain

1. Add a `CNAME` file to `public/` with the domain.
2. Configure the DNS records GitHub documents for Pages.
3. Enable **Enforce HTTPS** in the Pages settings.
4. Keep `base: "./"`; relative assets work at the root.

## Limits

GitHub Pages is fine for a demo and a personal reader:

- 1 GB published site size.
- 100 GB/month soft bandwidth limit.
- 10 builds per hour (soft limit).
- Static files only; no server-side code or custom headers.

The current build is well under these limits. The article cache lives in the
browser, not in the repository.

## Rollback

Pages deployments are tied to workflow runs. To roll back:

1. Revert the bad commit on `main`.
2. Push; the workflow redeploys the previous tree.
3. Alternatively, re-run an earlier successful workflow from the Actions tab.

Tag releases (`v0.1.0`, `v0.2.0`, …) so the deployed UI has a named version.

## Verification

After a deploy:

```bash
curl -sI https://albertthegr8r.github.io/inter-knot-board/ | head
curl -s https://albertthegr8r.github.io/inter-knot-board/ | grep -i content-security-policy
```

Then open the site, check the console for CSP errors, open a post, and confirm
the dialog closes with `Escape` and returns focus to the card.
