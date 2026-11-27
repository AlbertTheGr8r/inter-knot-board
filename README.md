# Inter-Knot

An RSS reader that looks and behaves like the **Inter-Knot board** from *Zenless Zone Zero*: a dark masonry wall of post cards, a floating pill header, and a post view that opens over a blurred board.

The project is a **static site**. No framework, no server required to render it.

## Status

Scaffold / milestone 1. What works today:

- The board shell: textured backdrop, floating header, profile chip, three pill tabs, bottom-right feed filter.
- Order-preserving masonry (4 → 3 → 2 → 1 columns) with variable-height cards.
- Card anatomy from the reference: media, relative-time badge, `NEW` sticker, OP row, bracketed tag, title clamp, excerpt clamp.
- Deterministic generated poster art for posts without a photo (8 palettes, 5 patterns) — no gray placeholder boxes.
- A post dialog built on `@ui-sdk/web/dialog`: blurred backdrop, source bar, red close button, optional system note, two-pane body, `Expand` for long text, quote card, tags, comments with floor badges.
- Demo, in-world content so the layout can be evaluated before feeds are connected.

Not wired yet: the actual RSS pipeline, feed management, OPML, persistence, search, and the build-time feed baker. That is milestone 2+.

## Stack

- **Vite 8 + TypeScript**, static output in `dist/`
- **Lit 3** with light-DOM rendering (`createRenderRoot() { return this }`)
- **@ui-sdk/web** (Vercel Labs UI SDK, beta) for accessible Dialog and Tabs behaviors; all styling is ours
- **@fontsource** for self-hosted Anton + Figtree (stand-ins for the game's proprietary type)
- `dompurify` and `idb-keyval` are installed for the upcoming feed/reader layer

Bun is the package manager here because no Node/npm is installed on this machine.

```bash
bun install
bun run dev      # http://localhost:5173
bun run build    # type-check + static build into dist/
bun run preview
```

## Layout

```
src/
  components/   ik-app, ik-topbar, ik-board, ik-card, ik-poster, ik-post-dialog
  data/         types + in-world demo articles
  lib/          hashing/PRNG, relative time, initials
  styles/       tokens, base, chrome, board, post
  ui/           light-DOM base class, inline icon set
reference/      design screenshots (study only, not shipped)
public/         favicon
```

## Design notes

- Palette sampled from the screenshots: accent `#F1D80A`, close-red `#C22A12`, glow `#FF4A2B`, cyan `#ADDFFF`, surfaces `#1B1B1E`/`#232327`.
- The board scrolls under a gradient header; cards peek above it, as in-game.
- Tags stay monochrome white; red is reserved for unread/urgent/close. No fake view counts — the badge shows relative time, and the heart shows reading time when a real feed has no likes.
- Posters are generated from `hash(article.id + title)`, so they are stable across reloads and unique per post.
- No game textures, logos, art, or fonts are copied. The globe mark and poster art are CSS/SVG.

## Next

1. Feed model + RSS/Atom/JSON parser, adapter chain (baked → direct → configurable proxy → optional relay).
2. Baked presets + `scripts/bake-feeds.ts` + scheduled deploy.
3. Feed manager, OPML import/export, unread/saved persistence, search.
4. Keyboard navigation, responsive polish, PWA/offline, a11y audit.
