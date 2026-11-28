import { html, svg, type TemplateResult } from "lit";
import type { Article } from "../data/types";
import { hashString, mulberry32 } from "../lib/hash";
import { IkElement } from "../ui/base";

interface Palette {
  a: string;
  b: string;
  ink: string;
  accent: string;
  accentText: string;
}

const PALETTES: Palette[] = [
  {
    a: "#f1d80a",
    b: "#d5a400",
    ink: "#101010",
    accent: "#ff4a2b",
    accentText: "#ffffff",
  },
  {
    a: "#1a1033",
    b: "#3d1c70",
    ink: "#f1e9ff",
    accent: "#39e0c8",
    accentText: "#062a26",
  },
  {
    a: "#e8e2d4",
    b: "#cfc5b0",
    ink: "#171717",
    accent: "#d9342b",
    accentText: "#ffffff",
  },
  {
    a: "#0d2b3b",
    b: "#12455e",
    ink: "#d9f4ff",
    accent: "#ffb347",
    accentText: "#241200",
  },
  {
    a: "#d8362b",
    b: "#8f1a13",
    ink: "#fff2e4",
    accent: "#161616",
    accentText: "#ffe9d6",
  },
  {
    a: "#0f0f10",
    b: "#262626",
    ink: "#f1d80a",
    accent: "#f1d80a",
    accentText: "#111111",
  },
  {
    a: "#bfe3c0",
    b: "#86c48c",
    ink: "#102114",
    accent: "#f05a28",
    accentText: "#ffffff",
  },
  {
    a: "#efe9dc",
    b: "#d7cbb4",
    ink: "#1a1a1a",
    accent: "#2a6bff",
    accentText: "#ffffff",
  },
];

const STOP_WORDS = new Set([
  "the",
  "a",
  "an",
  "of",
  "to",
  "in",
  "on",
  "for",
  "and",
  "is",
  "are",
  "my",
  "your",
  "this",
  "that",
  "whats",
  "what's",
]);

function headlineWord(title: string): string {
  const words = title
    .replace(/[^\p{L}\p{N}\s'-]/gu, "")
    .split(/\s+/)
    .filter(Boolean);

  const picked =
    words.find((word) => !STOP_WORDS.has(word.toLowerCase())) ??
    words[0] ??
    "POST";

  return picked.replace(/'/g, "").toUpperCase();
}

/**
 * Deterministic poster art for posts without a photo. The background/pattern
 * is SVG; the type is a CSS overlay so it stays anchored at any aspect ratio.
 */
export class IkPoster extends IkElement {
  static properties = {
    article: { attribute: false },
  };

  article: Article | null = null;

  render(): TemplateResult {
    const article = this.article;
    if (!article) {
      return html``;
    }

    const seed = hashString(`${article.id}:${article.title}`);
    const random = mulberry32(seed);
    const palette =
      PALETTES[Math.floor(random() * PALETTES.length)] ?? PALETTES[0]!;
    const pattern = Math.floor(random() * 5);
    const uid = `ik${(seed % 1679616).toString(36)}`;
    const word = headlineWord(article.title);
    const feedWord = article.feedTitle.split(/\s+/)[0]?.toUpperCase() ?? "FEED";
    const feedCode =
      article.feedTitle
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "")
        .slice(0, 18)
        .toUpperCase() || "FEED";

    return html`
      <div
        class="ik-poster"
        style=${`--p-a:${palette.a};--p-b:${palette.b};--p-ink:${palette.ink};--p-accent:${palette.accent};--p-accent-text:${palette.accentText};--ik-chars:${Math.max(3, word.length)}`}
      >
        <svg
          class="ik-poster__art"
          viewBox="0 0 400 500"
          preserveAspectRatio="xMidYMid slice"
          aria-hidden="true"
          focusable="false"
        >
          <defs>
            <linearGradient id="${uid}grad" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stop-color="${palette.a}"></stop>
              <stop offset="1" stop-color="${palette.b}"></stop>
            </linearGradient>
            <pattern
              id="${uid}dots"
              width="16"
              height="16"
              patternUnits="userSpaceOnUse"
            >
              <circle
                cx="4"
                cy="4"
                r="1.7"
                fill="${palette.ink}"
                opacity=".26"
              ></circle>
            </pattern>
          </defs>

          <rect width="400" height="500" fill="url(#${uid}grad)"></rect>
          ${this.patternLayer(pattern, palette, uid, random)}
        </svg>

        <span class="ik-poster__feed">${feedWord}</span>
        <span class="ik-poster__word">${word}</span>
        <span class="ik-poster__code">INTER-KNOT // ${feedCode}</span>
      </div>
    `;
  }

  private patternLayer(
    kind: number,
    palette: Palette,
    uid: string,
    random: () => number,
  ): TemplateResult {
    switch (kind) {
      case 0:
        return svg`
          <g fill="none" stroke="${palette.ink}" stroke-width="2" opacity=".22">
            <circle cx="310" cy="146" r="54"></circle>
            <circle cx="310" cy="146" r="92"></circle>
            <circle cx="310" cy="146" r="130"></circle>
          </g>
        `;
      case 1:
        return svg`<rect width="400" height="500" fill="url(#${uid}dots)"></rect>`;
      case 2:
        return svg`
          <g fill="${palette.ink}" opacity=".16" transform="rotate(22 200 250)">
            ${Array.from(
              { length: 9 },
              (_, index) => svg`
                <rect
                  x="${-140 + index * 58}"
                  y="-80"
                  width="20"
                  height="740"
                ></rect>
              `,
            )}
          </g>
        `;
      case 3:
        return svg`
          <g opacity=".2" transform="translate(298 150)">
            ${Array.from(
              { length: 16 },
              (_, index) => svg`
                <rect
                  x="-2"
                  y="-124"
                  width="4"
                  height="124"
                  fill="${palette.ink}"
                  transform="rotate(${index * 22.5})"
                ></rect>
              `,
            )}
          </g>
        `;
      default:
        return svg`
          <g opacity=".82">
            ${Array.from(
              { length: 26 },
              (_, index) => svg`
                <rect
                  x="${26 + index * 13}"
                  y="${300 + Math.round(random() * 18)}"
                  width="${3 + Math.round(random() * 8)}"
                  height="${58 + Math.round(random() * 92)}"
                  fill="${palette.ink}"
                ></rect>
              `,
            )}
          </g>
        `;
    }
  }
}

customElements.define("ik-poster", IkPoster);
