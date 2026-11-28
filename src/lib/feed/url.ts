import { hashString } from "../hash";

const FEED_COLORS = [
  "#f1d80a",
  "#ff5a36",
  "#6bd0ff",
  "#9ad46a",
  "#b18cff",
  "#ffb347",
  "#ff6fae",
  "#39e0c8",
];

/**
 * Normalize a user- or OPML-supplied feed URL. Only absolute HTTP(S) URLs are
 * accepted, and credentials in the URL are rejected rather than stored.
 */
export function normalizeFeedUrl(input: string): string | null {
  let value = input.trim();
  if (!value || /\s/.test(value)) return null;

  if (value.startsWith("feed://")) {
    value = `https://${value.slice("feed://".length)}`;
  } else if (value.startsWith("webcal://")) {
    value = `https://${value.slice("webcal://".length)}`;
  } else if (!/^[a-z][a-z0-9+.-]*:\/\//i.test(value)) {
    value = `https://${value}`;
  }

  try {
    const url = new URL(value);
    if (url.protocol !== "https:" && url.protocol !== "http:") return null;
    if (url.username || url.password) return null;
    if (!url.hostname || url.hostname.includes("%")) return null;
    url.hash = "";
    return url.href;
  } catch {
    return null;
  }
}

export function isHttpsUrl(value: string): boolean {
  try {
    return new URL(value).protocol === "https:";
  } catch {
    return false;
  }
}

export function feedIdForUrl(url: string): string {
  return `f${hashString(url).toString(36)}`;
}

export function feedTitleFromUrl(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "Untitled feed";
  }
}

export function feedHost(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

export function feedColorForUrl(url: string): string {
  return FEED_COLORS[hashString(url) % FEED_COLORS.length] ?? FEED_COLORS[0]!;
}

export function authorColorForName(name: string): string {
  return FEED_COLORS[hashString(name) % FEED_COLORS.length] ?? FEED_COLORS[0]!;
}
