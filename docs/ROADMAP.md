# Roadmap

The project is a personal daily reader that is also published as a tech demo.
Priorities follow that: reliability first, visual polish second.

## v0.1.0 — UI demo

Shipped in this repository.

- Board, post dialog, filters, demo content.
- Generated posters, responsive layout, keyboard basics.
- Static GitHub Pages build, CSP meta, tests and CI.
- Public documentation, license, security and contribution policies.

Not in v0.1.0: real feed fetching. The board uses in-world demo posts.

## v0.1.1 — board sections and mindful pass

Shipped after the first UI demo.

- Four sections: Board, Saved, Sources, History.
- Bottom-right filter with All / Unread / Read plus source scope.
- Mindful timer replacing the level/XP readout; cap, refill, Unlimited.
- Adaptive `Load more` at roughly five board viewports; no infinite scroll.
- Opening a post marks it read, files it in History, and allows saving.
- Opt-in read-on-scroll with a full-card dwell.
- Source identity on cards; Proxy sheet for preferences.
- Red tab alerts use the game's warning triangle.

## v0.2.0 — feed core

- RSS 2.0, Atom, RDF, and JSON Feed parsing.
- Direct transport with time/size limits and useful error classes.
- Feed manager: add, remove, refresh, error state. The Sources section becomes
  the real manager.
- Add-feed discovery from an HTML page (`<link rel="alternate">`).
- IndexedDB article cache; read/starred state; unread counts.
- OPML import/export.
- Search across titles and article text.
- Keyboard navigation: `J`/`K`, `Enter`, `S`, `U`, `/`, `Esc`.
- Mark all read, per-feed refresh, refresh on open.

## v0.3.0 — local proxy

- Single-file Bun reference server under `tools/local-api/`.
- SSRF guard, loopback bind, CORS allowlist, optional bearer token, rate limit,
  timeout and size caps.
- Settings UI for transport/proxy URL/token, with a connection test.
- Documentation for running it as a user service.
- Feed compatibility check for curated presets.

## v0.4.0 — reader backends

- FreshRSS read-only adapter via the Google Reader API; mark read/starred next.
- Miniflux adapter via `X-Auth-Token`, with the CORS/reverse-proxy caveat.
- Backend selection in settings; no secrets in the static bundle.
- Clear separation: the app is the board UI; the backend owns fetching and sync.

## v0.5.0 — Lemmy and daily polish

- Lemmy community/user feeds via the generic RSS pipeline.
- Optional read-only comment fetching through the public API.
- Offline/PWA pass, accessibility audit, deeper mobile layout.
- Performance: article pruning, image loading, larger-cache behavior.

## Non-goals

- A hosted SaaS, accounts, billing, or multi-tenant sync.
- A public CORS proxy or a feed-fetching backend in this repository.
- Voting, posting, or moderation actions on Lemmy or other fediverse services.
- Infinite scroll, engagement ranking, or a feed that optimizes for time on
  site. The board is a reading surface, not a timeline.
- Shipping game assets, official fonts, or reference screenshots.
- Supporting every feed quirk. The parser should be robust, not infinite.

## Versioning

`0.x` while the feed pipeline is incomplete. Releases are tagged and deployed
from `main`; the Pages site always reflects the latest successful build.
