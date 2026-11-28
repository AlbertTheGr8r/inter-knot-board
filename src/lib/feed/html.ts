import DOMPurify from "dompurify";

const ALLOWED_TAGS = [
  "a",
  "b",
  "blockquote",
  "br",
  "caption",
  "cite",
  "code",
  "div",
  "em",
  "figcaption",
  "figure",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "hr",
  "i",
  "img",
  "li",
  "ol",
  "p",
  "pre",
  "s",
  "small",
  "span",
  "strong",
  "sub",
  "sup",
  "table",
  "tbody",
  "td",
  "th",
  "thead",
  "tr",
  "u",
  "ul",
];

const ALLOWED_ATTR = [
  "alt",
  "cite",
  "colspan",
  "height",
  "href",
  "rowspan",
  "src",
  "title",
  "width",
];

export function resolveUrl(
  value: string | null | undefined,
  base: string,
): string | null {
  if (!value) return null;
  try {
    const url = new URL(value, base);
    if (url.protocol !== "https:" && url.protocol !== "http:") return null;
    return url.href;
  } catch {
    return null;
  }
}

export function htmlToText(html: string): string {
  const template = document.createElement("template");
  template.innerHTML = html;
  template.content
    .querySelectorAll("script, style, noscript")
    .forEach((node) => node.remove());
  return (template.content.textContent ?? "").replace(/\s+/g, " ").trim();
}

export function truncateText(value: string, limit = 220): string {
  const text = value.replace(/\s+/g, " ").trim();
  if (text.length <= limit) return text;

  const cut = text.slice(0, limit);
  const lastSpace = cut.lastIndexOf(" ");
  const trimmed = (lastSpace > limit * 0.6 ? cut.slice(0, lastSpace) : cut)
    .replace(/[\s,;:.!?-]+$/, "")
    .trim();

  return `${trimmed}…`;
}

export function estimateMinutes(text: string): number {
  const words = text.split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 220));
}

export function extractFirstImage(
  html: string | undefined,
  base: string,
): { url: string; aspect?: number } | undefined {
  if (!html) return undefined;

  const template = document.createElement("template");
  template.innerHTML = html;

  for (const image of template.content.querySelectorAll("img")) {
    const raw = image.getAttribute("src") ?? image.getAttribute("data-src");
    if (!raw || raw.startsWith("data:")) continue;

    const url = resolveUrl(raw, base);
    if (!url) continue;

    const width = Number(image.getAttribute("width"));
    const height = Number(image.getAttribute("height"));
    if ((width > 0 && width <= 2) || (height > 0 && height <= 2)) continue;

    const aspect =
      Number.isFinite(width) &&
      Number.isFinite(height) &&
      width > 0 &&
      height > 0
        ? width / height
        : undefined;

    return { url, aspect };
  }

  return undefined;
}

/**
 * Feed HTML is untrusted. Sanitize it, then rewrite links and images so the
 * reader can never execute a script or navigate the app itself.
 */
export function sanitizeArticleHtml(html: string, base: string): string {
  if (!html.trim()) return "";

  const cleaned = DOMPurify.sanitize(html, {
    ALLOWED_TAGS,
    ALLOWED_ATTR,
    ALLOW_DATA_ATTR: false,
    ALLOW_UNKNOWN_PROTOCOLS: false,
    FORBID_TAGS: [
      "audio",
      "button",
      "embed",
      "form",
      "iframe",
      "input",
      "link",
      "math",
      "meta",
      "object",
      "option",
      "script",
      "select",
      "source",
      "style",
      "svg",
      "textarea",
      "track",
      "video",
    ],
  });

  const template = document.createElement("template");
  template.innerHTML = cleaned;

  for (const anchor of template.content.querySelectorAll("a")) {
    const href = resolveUrl(anchor.getAttribute("href"), base);
    if (!href) {
      anchor.removeAttribute("href");
      continue;
    }
    anchor.setAttribute("href", href);
    anchor.setAttribute("target", "_blank");
    anchor.setAttribute("rel", "noopener noreferrer nofollow");
  }

  for (const image of template.content.querySelectorAll("img")) {
    const width = Number(image.getAttribute("width"));
    const height = Number(image.getAttribute("height"));
    if ((width > 0 && width <= 2) || (height > 0 && height <= 2)) {
      image.remove();
      continue;
    }

    const src = resolveUrl(image.getAttribute("src"), base);
    if (!src) {
      image.remove();
      continue;
    }
    image.setAttribute("src", src);
    image.setAttribute("loading", "lazy");
    image.setAttribute("decoding", "async");
    image.setAttribute("referrerpolicy", "no-referrer");
  }

  return template.innerHTML.trim();
}

/**
 * The lead image already has its own figure in the post view. Remove the same
 * image from the body so it does not appear twice. Other inline images stay.
 */
export function removeLeadImage(html: string, imageUrl: string): string {
  const template = document.createElement("template");
  template.innerHTML = html;

  for (const image of template.content.querySelectorAll("img")) {
    if (image.getAttribute("src") === imageUrl) {
      image.remove();
      break;
    }
  }

  return template.innerHTML.trim();
}

export function paragraphsFromHtml(html: string): string[] {
  const template = document.createElement("template");
  template.innerHTML = html;

  const blocks = Array.from(
    template.content.querySelectorAll(
      "p, li, blockquote, pre, h1, h2, h3, h4, h5, h6",
    ),
  )
    .map((block) => (block.textContent ?? "").replace(/\s+/g, " ").trim())
    .filter(Boolean);

  if (blocks.length > 0) return blocks;

  return (template.content.textContent ?? "")
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.replace(/\s+/g, " ").trim())
    .filter(Boolean);
}
