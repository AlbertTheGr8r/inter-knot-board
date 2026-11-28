# Architecture

Inter-Knot Board is a static single-page app. There is no server component in the
repository, and the deployed site has no accounts, database, or API.

The design goal is narrow: make a feed reader that feels like a board of posts.
The engineering goal is equally narrow: keep the static build small enough to
read, and make the feed transport replaceable so a local proxy or an existing
reader backend can be added without rewriting the UI.

## Status

v0.2.0 ships the direct feed core. `ik-app` loads feeds and cached articles from
IndexedDB, refreshes stale feeds with the browser transport, and feeds the same
sections, scoped filter, mindful timer, and pagination that the UI demo used.
The board starts empty; there is no demo dataset. The local proxy and reader
backends remain v0.3.0/v0.4.0 work, and the transport seam is kept so they can
land without rewriting the parser or UI.

## Stack

| Layer      | Choice                                  | Why                                                                                    |
| ---------- | --------------------------------------- | -------------------------------------------------------------------------------------- |
| Build      | Vite + TypeScript                       | Fast static builds, relative asset paths, no runtime.                                  |
| Components | Lit 3, light DOM                        | Small reactive layer; global CSS and design tokens apply without shadow-boundary work. |
| Behaviors  | `@ui-sdk/web`                           | Unstyled Dialog/Tabs with focus management and ARIA. We own every pixel.               |
| Styling    | Handwritten CSS + tokens                | The UI is bespoke; utility classes would fight the chrome and poster art.              |
| Fonts      | Anton + Barlow + Barlow Condensed       | Self-hosted lookalikes; the game's fonts are proprietary and not shipped.              |
| Security   | DOMPurify + CSP meta                    | Feed HTML is untrusted; scripts, event handlers, and unsafe URLs are stripped.         |
| Storage    | IndexedDB (`idb-keyval`) + localStorage | Feed metadata and articles share a cache; preferences stay small.                      |

`@ui-sdk/web` is pinned to `0.1.0-beta.18`. It is beta software; each SDK element
is treated as an implementation detail behind our own `<ik-*>` component so it
can be replaced without touching the design layer.

## Component map

| Element            | Responsibility                                                                       |
| ------------------ | ------------------------------------------------------------------------------------ |
| `<ik-app>`         | Owns feeds, cache, refresh, articles, section, filters, read/saved state, timer.     |
| `<ik-topbar>`      | Refresh control, mindful cap chip, `Board`/`Saved`/`Sources`/`History`.              |
| `<ik-board>`       | Masonry layout, adaptive batch size, optional read-on-scroll observer.               |
| `<ik-card>`        | One post: lead image or poster, clock/time badge, author strip, tag, title, preview. |
| `<ik-poster>`      | Deterministic SVG/CSS poster for posts without a usable photo.                       |
| `<ik-post-dialog>` | Post reader over the blurred board; media, sanitized HTML, save, original link.      |
| `<ik-sources>`     | Add feed, OPML import, per-feed status, retry/remove, source scope.                  |
| `<ik-history>`     | Posts actually opened, not cards merely seen on the board.                           |
| `<ik-proxy>`       | Profile, mindful cap, appearance, read-on-scroll, transport notes.                   |
| `<ui-tabs>`        | ARIA tab behavior and panel selection.                                               |
| `<ui-dialog>`      | Top-layer modal, focus trap, Escape, focus return.                                   |

The board uses a shortest-column placement in `ik-board.ts`: cards are assigned
in feed order to the currently shortest column, which keeps each column
chronological while balancing height. `ResizeObserver` re-runs the layout when
the available width changes. Hidden tab panels measure `0px` and are relaid out
when shown.

## Sections and filters

The four top-level sections are **Board**, **Saved**, **Sources**, and
**History**. The bottom-right filter owns the view state: `All`, `Unread`, or
`Read`, plus an optional source scope. It does not duplicate the sections. The
popover opens upward; the scope group is pinned at the bottom so it stays near
the pointer when the source list is long.

Opening a post marks it read and adds an entry to History. Read-on-scroll, when
enabled, marks a card read after the whole card has been visible for 1.5 seconds;
it never adds to History. The unread scope disables auto-marking so the queue
stays intact.

## Mindful timer

The profile chip shows the current cap and a draining session bar instead of a
level and XP. Only active Board browsing drains the timer. The post dialog, the
Proxy sheet, other sections, a hidden tab, and an idle tab all pause it. Leaving
for more than five minutes recharges at one minute per minute away, up to the
cap. Changing the cap starts a fresh session. `Unlimited` is explicit and is
never the default. State is stored in `localStorage`; no network request is
involved.

## Data flow (v0.2.0)

```
feed URL / OPML file
   │
   ▼
transport (direct, CORS-only) ──► parser (RSS 2.0 / Atom / RDF / JSON Feed)
   │                                      │
   │  timeout, size cap, error classes    ▼
   │                                normalizer (IDs, dates, images, safe HTML,
   │                                tag, colours, reading time)
   │                                      │
   ▼                                      ▼
IndexedDB cache ◄────────────── ik-app ──► filtered, limited articles
   │                             │
   ├── feed metadata             ├──► ik-board ──► ik-card ──► image | poster
   ├── cached articles           ├──► ik-post-dialog ──► read / history / save
   └── read/starred/opened       ├──► ik-history ──► openedAt entries
                                 ├──► ik-sources ──► add / import / refresh
                                 └──► ik-proxy ──► mindful timer / preferences
```

The transport is the only place that knows where bytes came from. The parser and
normalizer are pure functions so they can run in the browser, in tests, and in a
future Node-side feed checker. A successful refresh merges into the cache and
applies the separate reading-state record; a failed refresh keeps the previous
articles and stores the exact error on the feed.

```ts
export interface FeedResponse {
  body: string;
  contentType: string;
  finalUrl: string;
  fetchedAt: string;
}

export function fetchFeed(
  url: string,
  options?: { signal?: AbortSignal; timeoutMs?: number; maxBytes?: number },
): Promise<FeedResponse>;
```

Direct is the only implemented transport. A local proxy or reader backend is
opt-in and never silently substituted for a failing direct request. The fetch
module returns the same `FeedResponse` shape those transports will use, so the
parser and normalizer do not change.

## Storage

- `localStorage`: mindful timer and cap, compact density, read-on-scroll
  preference.
- IndexedDB key `ik.feeds.v1`: feed metadata, last fetch, last error.
- IndexedDB key `ik.articles.v1`: normalized articles, capped per feed. Saved and
  opened posts are retained beyond the cap.
- IndexedDB key `ik.reading.v1`: read IDs, starred IDs, and opened timestamps.
  Keeping this separate means a cache prune cannot erase reading state.
- Secrets: API passwords/tokens belong in `sessionStorage` by default. Persisting
  them is an explicit opt-in with a warning; they are never written into URLs or
  logs. v0.2.0 has no credentials to store.

## Rendering notes

- **Light DOM.** `IkElement.createRenderRoot()` returns `this`, so global tokens,
  grain, and UI SDK parts share one stylesheet. There is no shadow-root theming
  layer to maintain.
- **Masonry.** CSS columns are avoided because they break reading order. The
  board is a flex row of flex columns. The first two bands are seeded in feed
  order, then the rest of the cards balance toward the shortest column.
- **Columns.** The board targets a 310px card, caps a column at 370px, keeps
  cards above 285px, and allows up to eight columns on very wide displays.
  `columnCountForWidth()` keeps the layout and pagination in sync.
- **Pagination.** The board measures its column count, viewport, and rendered
  card heights, then asks `computeBatchSize()` for roughly five screens of cards.
  The app keeps a `limit`; there is no scroll-triggered auto-load.
- **Read-on-scroll.** `IntersectionObserver` uses thresholds including full
  visibility, a root margin that excludes the fixed top bar, and a 1.5-second
  dwell. Tall cards pass when they cover the reading area instead of fitting
  inside it. Auto-marking is skipped in the Unread scope.
- **Images and posters.** A feed image is used when the parser finds one
  (`media:thumbnail`, `media:content`, enclosure, `itunes:image`, or the first
  content image). The card keeps a stable aspect ratio; a failed image falls back
  to the generated poster. `hash(article.id + title)` seeds the poster palette
  and pattern, and the large word/tag/code line is an HTML overlay so it stays
  anchored at any card aspect ratio.
- **Sanitized HTML.** Article bodies are sanitized once during normalization:
  scripts, styles, iframes, forms, event attributes, and unsafe URL schemes are
  removed; links are forced to `target="_blank"` with
  `rel="noopener noreferrer nofollow"`; relative image and link URLs are resolved
  against the post. The dialog renders that sanitized string and keeps the
  plain-text paragraph fallback for feeds that only provide text.
- **Dialogs.** `@ui-sdk/web/dialog` provides the top layer, focus trap and
  `openchange` lifecycle. CSS animates `data-starting-style` /
  `data-ending-style`.
- **Backdrop.** A fixed, static SVG masthead: three staggered lines filled with
  a dark hatch and rotated `-20deg`. Barlow Condensed carries the display type.
  There is no marquee and no game texture; it is original, generated markup.

## Testing

- Vitest covers deterministic helpers (`hashString`, `mulberry32`,
  `relativeTime`, `initials`, mindful timer math, adaptive batch size,
  scope/source filtering, column counts, and full-card visibility).
- The feed suite uses jsdom fixtures for RSS 2.0, Atom, YouTube Atom, RDF, JSON
  Feed, malformed XML, entity declarations, OPML nesting/dedupe, relative URLs,
  HTML sanitization, transport error classes, and cache/read-state preservation.
- The local proxy suite is still planned for v0.3.0 and will cover URL validation
  and private-IP blocking.
- CI runs `bun run check` (type-check, tests, production build) on every push and
  pull request.
