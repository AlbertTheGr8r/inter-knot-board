# Architecture

Inter-Knot Board is a static single-page app. There is no server component in the
repository, and the deployed site has no accounts, database, or API.

The design goal is narrow: make a feed reader that feels like a board of posts.
The engineering goal is equally narrow: keep the static build small enough to
read, and make the feed transport replaceable so a local proxy or an existing
reader backend can be added without rewriting the UI.

## Status

v0.1.0 is the UI demo. Components render in-world demo data from
`src/data/demo.ts`. The sections, scoped filter, mindful timer, adaptive
pagination, read-on-scroll heuristic, and History view are local-only. The feed
pipeline described below is the v0.2.0/v0.3.0 work; it is documented here so the
UI is built against the right seams.

## Stack

| Layer      | Choice                               | Why                                                                                    |
| ---------- | ------------------------------------ | -------------------------------------------------------------------------------------- |
| Build      | Vite + TypeScript                    | Fast static builds, relative asset paths, no runtime.                                  |
| Components | Lit 3, light DOM                     | Small reactive layer; global CSS and design tokens apply without shadow-boundary work. |
| Behaviors  | `@ui-sdk/web`                        | Unstyled Dialog/Tabs with focus management and ARIA. We own every pixel.               |
| Styling    | Handwritten CSS + tokens             | The UI is bespoke; utility classes would fight the chrome and poster art.              |
| Fonts      | Anton + Figtree via Fontsource       | Self-hosted lookalikes; the game's fonts are proprietary and not shipped.              |
| Security   | DOMPurify (planned), CSP meta        | Feed HTML is untrusted.                                                                |
| Storage    | `localStorage` + IndexedDB (planned) | Feed metadata/settings are small; articles need a larger cache.                        |

`@ui-sdk/web` is pinned to `0.1.0-beta.18`. It is beta software; each SDK element
is treated as an implementation detail behind our own `<ik-*>` component so it
can be replaced without touching the design layer.

## Component map

| Element            | Responsibility                                                                       |
| ------------------ | ------------------------------------------------------------------------------------ |
| `<ik-app>`         | Owns articles, section, scope, source filter, opened/saved state, timer, pagination. |
| `<ik-topbar>`      | Refresh control, mindful cap chip, `Board`/`Saved`/`Sources`/`History`.              |
| `<ik-board>`       | Masonry layout, adaptive batch size, optional read-on-scroll observer.               |
| `<ik-card>`        | One post: media, time badge, source mark, tag, title, excerpt.                       |
| `<ik-poster>`      | Deterministic SVG/CSS poster for posts without a photo.                              |
| `<ik-post-dialog>` | Post reader over the blurred board; save, comments, quote, system note.              |
| `<ik-sources>`     | Source management shell; direct RSS fills it next.                                   |
| `<ik-history>`     | Posts actually opened, not cards merely seen on the board.                           |
| `<ik-proxy>`       | Profile, mindful cap, appearance, read-on-scroll, local demo notes.                  |
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

## Data flow (v0.1.0)

```
demo.ts ──► ik-app ──► filtered, limited articles ──► ik-board ──► ik-card
                │                                      │
                │                                      ├──► ik-poster
                │                                      └──► read-on-scroll observer
                ├──► ik-post-dialog ──► read / history / save
                ├──► ik-history ──► openedAt entries
                └──► ik-proxy ──► mindful timer / preferences
```

No network requests are made.

## Data flow (planned)

```
feed URL
   │
   ▼
transport (direct | localProxy | freshrss | miniflux | lemmyRss)
   │  fetch + size/time limits
   ▼
parser (RSS 2.0 / Atom / RDF / JSON Feed)
   │
   ▼
normalizer (URLs, dates, images, text, dedupe)
   │
   ▼
article store (IndexedDB cache, read/starred state)
   │
   ▼
ik-app ──► board / dialog
```

The transport is the only place that knows where bytes came from. The parser and
normalizer are pure functions so they can run in the browser, in tests, and in
the Node-side feed checker.

```ts
export type FeedTransportId = "direct" | "localProxy" | "freshrss" | "miniflux";

export interface FeedRequest {
  url: string;
  signal?: AbortSignal;
}

export interface FeedResponse {
  body: string;
  contentType: string;
  finalUrl: string;
  fetchedAt: string;
}

export interface FeedTransport {
  id: FeedTransportId;
  label: string;
  fetchFeed(request: FeedRequest): Promise<FeedResponse>;
}
```

The app selects a transport in settings. Direct is the default. A local proxy or
a reader backend is opt-in and never silently substituted for a failing direct
request.

## Storage plan

- `localStorage`: transport choice, proxy URL, mindful timer and cap, compact
  density, read-on-scroll preference, feed list metadata.
- `IndexedDB`: normalized articles (capped per feed), read/starred flags, opened
  history, last fetch times, last error per feed.
- Secrets: API passwords/tokens in `sessionStorage` by default. Persisting them
  is an explicit opt-in with a warning; they are never written into URLs or
  logs.

## Rendering notes

- **Light DOM.** `IkElement.createRenderRoot()` returns `this`, so global tokens,
  grain, and UI SDK parts share one stylesheet. There is no shadow-root theming
  layer to maintain.
- **Masonry.** CSS columns are avoided because they break reading order. The
  board is a flex row of flex columns, filled by estimated height.
- **Pagination.** The board measures its column count, viewport, and rendered
  card heights, then asks `computeBatchSize()` for roughly five screens of cards.
  The app keeps a `limit`; there is no scroll-triggered auto-load.
- **Read-on-scroll.** `IntersectionObserver` uses thresholds including full
  visibility, a root margin that excludes the fixed top bar, and a 1.5-second
  dwell. Tall cards pass when they cover the reading area instead of fitting
  inside it. Auto-marking is skipped in the Unread scope.
- **Posters.** `hash(article.id + title)` seeds a palette and pattern. The art is
  SVG; the large word/tag/code line is a HTML overlay so it stays anchored at any
  card aspect ratio.
- **Dialogs.** `@ui-sdk/web/dialog` provides the top layer, focus trap and
  `openchange` lifecycle. CSS animates `data-starting-style` /
  `data-ending-style`.

## Testing

- Vitest covers deterministic helpers (`hashString`, `mulberry32`,
  `relativeTime`, `initials`, mindful timer math, adaptive batch size,
  scope/source filtering, and full-card visibility).
- The planned parser suite uses fixtures for RSS 2.0, Atom, RDF, JSON Feed,
  malformed XML, relative URLs, and entity-expansion attempts.
- The planned proxy suite covers URL validation and private-IP blocking.
- CI runs `bun run check` (type-check, tests, production build) on every push and
  pull request.
