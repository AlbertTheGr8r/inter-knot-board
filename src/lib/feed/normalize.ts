import type { Article, Feed, Tag } from "../../data/types";
import { hashString, mulberry32 } from "../hash";
import {
  estimateMinutes,
  extractFirstImage,
  htmlToText,
  paragraphsFromHtml,
  removeLeadImage,
  resolveUrl,
  sanitizeArticleHtml,
  truncateText,
} from "./html";
import type { ParsedFeed, ParsedItem } from "./parse-types";
import { authorColorForName } from "./url";

const TAGS: ReadonlySet<string> = new Set<Tag>([
  "Post",
  "Commission",
  "Help",
  "Urgent",
  "Important",
  "Intel",
  "Notice",
  "Info",
  "Release",
]);

function tagFor(item: ParsedItem, feed: Feed): Tag {
  const exact = item.categories.find((category) => TAGS.has(category));
  if (exact) return exact as Tag;

  const source = `${feed.url} ${feed.title}`.toLowerCase();
  if (/github\.com\/.*\/releases|releases\.atom/.test(feed.url)) {
    return "Release";
  }
  if (/leak/.test(source)) return "Intel";

  return "Post";
}

function aspectSeed(id: string): number {
  const random = mulberry32(hashString(id));
  return 1.12 + random() * 0.48;
}

function clampAspect(value: number | undefined): number | undefined {
  if (!value || !Number.isFinite(value)) return undefined;
  return Math.max(0.9, Math.min(1.9, value));
}

function authorName(value: string | undefined, fallback: string): string {
  const name = value?.replace(/\s+/g, " ").trim();
  if (!name || name.includes("@")) return fallback;
  return name;
}

function normalizeItem(
  item: ParsedItem,
  feed: Feed,
  parsed: ParsedFeed,
  fetchedAt: string,
): Article | null {
  const base = item.link ?? parsed.siteUrl ?? feed.url;
  const rawHtml = item.html;
  const sanitized = rawHtml ? sanitizeArticleHtml(rawHtml, base) : "";
  const contentText = sanitized
    ? htmlToText(sanitized)
    : (item.text ?? "").replace(/\s+/g, " ").trim();
  const title = item.title.replace(/\s+/g, " ").trim() || "Untitled";

  if (!title && !contentText) return null;

  const excerpt = truncateText(contentText || title);
  const extracted = extractFirstImage(rawHtml, base);
  const image = resolveUrl(item.image, base) ?? extracted?.url;
  const imageAspect = clampAspect(item.imageAspect ?? extracted?.aspect);
  const bodyHtml = image ? removeLeadImage(sanitized, image) : sanitized;
  const identity = item.id ?? item.link ?? title;
  const seed =
    item.id || item.link
      ? `${feed.id}|${identity}`
      : `${feed.id}|${identity}|${item.publishedAt ?? ""}`;
  const id = `a${hashString(seed).toString(36)}`;
  const feedTitle =
    parsed.title && parsed.title !== "Untitled feed"
      ? parsed.title
      : feed.title;
  const author = authorName(item.author, feedTitle);
  const content =
    bodyHtml.length > 0
      ? paragraphsFromHtml(bodyHtml)
      : (item.text ?? "")
          .split(/\n{2,}/)
          .map((paragraph) => paragraph.replace(/\s+/g, " ").trim())
          .filter(Boolean);

  return {
    id,
    feedId: feed.id,
    feedTitle,
    feedColor: feed.color,
    author,
    authorColor: authorColorForName(author),
    title,
    excerpt,
    content: content.length > 0 ? content : [excerpt],
    contentHtml: bodyHtml || undefined,
    image,
    imageAspect,
    tag: tagFor(item, feed),
    publishedAt: item.publishedAt ?? fetchedAt,
    unread: true,
    starred: false,
    aspect: imageAspect ?? aspectSeed(id),
    minutes: estimateMinutes(contentText || title),
    link: item.link,
  };
}

/**
 * Turn a parsed feed into articles. IDs are stable across refreshes so read,
 * saved, and history state keep pointing at the same post.
 */
export function normalizeFeed(
  parsed: ParsedFeed,
  feed: Feed,
  fetchedAt: string,
): Article[] {
  const seen = new Set<string>();
  const articles: Article[] = [];

  for (const item of parsed.items) {
    const article = normalizeItem(item, feed, parsed, fetchedAt);
    if (!article || seen.has(article.id)) continue;
    seen.add(article.id);
    articles.push(article);
  }

  return articles.sort(
    (a, b) => Date.parse(b.publishedAt) - Date.parse(a.publishedAt),
  );
}
