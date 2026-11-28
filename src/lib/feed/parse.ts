import { FeedError } from "./errors";
import { extractFirstImage, resolveUrl } from "./html";
import type { ParsedFeed, ParsedItem } from "./parse-types";
import {
  atomLink,
  attribute,
  childElements,
  childText,
  cleanAuthor,
  collapseWhitespace,
  descendantText,
  descendants,
  firstChildElement,
  firstValidDate,
  plainText,
} from "./xml";

export interface ParseContext {
  feedUrl: string;
  contentType?: string;
}

interface ImageCandidate {
  url: string;
  aspect?: number;
}

const IMAGE_EXTENSION = /\.(?:avif|gif|jpe?g|png|webp)(?:[?#]|$)/i;

function imageCandidate(
  element: Element | undefined,
  base: string,
): ImageCandidate | undefined {
  if (!element) return undefined;

  const raw =
    attribute(element, "url") ??
    attribute(element, "href") ??
    (element.localName === "image"
      ? (childText(element, "url") ?? element.textContent?.trim())
      : undefined);
  const url = resolveUrl(raw, base);
  if (!url) return undefined;

  const type = attribute(element, "type") ?? "";
  const medium = attribute(element, "medium") ?? "";
  const isImage =
    type.startsWith("image/") ||
    type === "image" ||
    medium === "image" ||
    IMAGE_EXTENSION.test(url);
  if (!isImage) return undefined;

  const width = Number(attribute(element, "width"));
  const height = Number(attribute(element, "height"));
  if ((width > 0 && width <= 2) || (height > 0 && height <= 2)) {
    return undefined;
  }
  const aspect =
    Number.isFinite(width) && Number.isFinite(height) && width > 0 && height > 0
      ? width / height
      : undefined;

  return { url, aspect };
}

function firstImageFromElements(
  elements: Element[],
  base: string,
): ImageCandidate | undefined {
  for (const element of elements) {
    const candidate = imageCandidate(element, base);
    if (candidate) return candidate;
  }
  return undefined;
}

function itemImage(
  item: Element,
  html: string | undefined,
  base: string,
): ImageCandidate | undefined {
  const fromMedia =
    firstImageFromElements(descendants(item, "thumbnail"), base) ??
    firstImageFromElements(descendants(item, "content"), base) ??
    firstImageFromElements(descendants(item, "enclosure"), base) ??
    firstImageFromElements(descendants(item, "image"), base);

  if (fromMedia) return fromMedia;

  return extractFirstImage(html, base);
}

function parseRssItem(
  item: Element,
  base: string,
  feedAuthor?: string,
): ParsedItem {
  const title = plainText(childText(item, "title")) || "Untitled";
  const guid = childText(item, "guid");
  const link =
    resolveUrl(childText(item, "link"), base) ??
    resolveUrl(atomLink(item), base) ??
    (attribute(firstChildElement(item, "guid"), "isPermaLink") !== "false"
      ? resolveUrl(guid, base)
      : null) ??
    undefined;

  const html =
    childText(item, "encoded") ??
    childText(item, "description") ??
    descendantText(item, "encoded") ??
    undefined;
  const publishedAt = firstValidDate([
    childText(item, "pubDate"),
    descendantText(item, "date"),
    childText(item, "updated"),
  ]);
  const author = cleanAuthor(
    childText(item, "author") ?? descendantText(item, "creator") ?? feedAuthor,
  );
  const categories = descendants(item, "category")
    .map((category) => collapseWhitespace(category.textContent ?? ""))
    .filter(Boolean);
  const image = itemImage(item, html, link ?? base);

  return {
    id: guid ?? link ?? `${title}:${publishedAt ?? ""}`,
    title,
    link,
    publishedAt,
    author,
    html,
    image: image?.url,
    imageAspect: image?.aspect,
    categories,
  };
}

function parseAtomContent(element: Element | undefined): {
  html?: string;
  text?: string;
} {
  if (!element) return {};
  const type = attribute(element, "type") ?? "text";

  if (type === "xhtml" || type.endsWith("xhtml")) {
    const div = firstChildElement(element, "div");
    return { html: div?.innerHTML ?? element.innerHTML };
  }

  const value = element.textContent ?? "";
  if (type === "html" || type.endsWith("/html")) return { html: value };
  return { text: value };
}

function parseAtomItem(
  entry: Element,
  base: string,
  feedAuthor?: string,
): ParsedItem {
  const title = plainText(childText(entry, "title")) || "Untitled";
  const link = resolveUrl(atomLink(entry), base) ?? undefined;
  const id = childText(entry, "id") ?? link;
  const publishedAt = firstValidDate([
    childText(entry, "published"),
    childText(entry, "updated"),
    descendantText(entry, "date"),
  ]);
  const authorElement = firstChildElement(entry, "author");
  const author = cleanAuthor(
    (authorElement ? childText(authorElement, "name") : undefined) ??
      feedAuthor,
  );
  const content = parseAtomContent(firstChildElement(entry, "content"));
  const summary = parseAtomContent(firstChildElement(entry, "summary"));
  const mediaDescription = descendantText(entry, "description");
  const html = content.html ?? summary.html ?? undefined;
  const text = content.text ?? summary.text ?? mediaDescription ?? undefined;
  const categories = childElements(entry, "category")
    .map(
      (category) =>
        attribute(category, "term") ??
        collapseWhitespace(category.textContent ?? ""),
    )
    .filter(Boolean);
  const image = itemImage(entry, html, link ?? base);

  return {
    id,
    title,
    link,
    publishedAt,
    author,
    html,
    text,
    image: image?.url,
    imageAspect: image?.aspect,
    categories,
  };
}

function parseRss(
  document: Document,
  base: string,
  format: "rss" | "rdf",
): ParsedFeed {
  const root = document.documentElement;
  const channel = firstChildElement(root, "channel") ?? root;
  const title =
    plainText(childText(channel, "title")) ||
    plainText(descendantText(root, "title")) ||
    "Untitled feed";
  const siteUrl =
    resolveUrl(childText(channel, "link"), base) ??
    resolveUrl(atomLink(channel), base) ??
    undefined;
  const feedAuthor = cleanAuthor(
    childText(channel, "managingEditor") ?? childText(channel, "webMaster"),
  );
  const itemElements =
    format === "rdf"
      ? childElements(root, "item")
      : childElements(channel, "item");
  const items = itemElements
    .map((item) => parseRssItem(item, base, feedAuthor))
    .filter((item) => item.title || item.html || item.link);

  return {
    title,
    siteUrl,
    description: plainText(childText(channel, "description")),
    format,
    items,
  };
}

function parseAtom(document: Document, base: string): ParsedFeed {
  const root = document.documentElement;
  const title = plainText(childText(root, "title")) || "Untitled feed";
  const siteUrl = resolveUrl(atomLink(root), base) ?? undefined;
  const feedAuthorElement = firstChildElement(root, "author");
  const feedAuthor = cleanAuthor(
    feedAuthorElement ? childText(feedAuthorElement, "name") : undefined,
  );
  const items = childElements(root, "entry")
    .map((entry) => parseAtomItem(entry, base, feedAuthor))
    .filter((item) => item.title || item.html || item.text || item.link);

  return {
    title,
    siteUrl,
    description: plainText(childText(root, "subtitle")),
    format: "atom",
    items,
  };
}

function parseJsonFeed(body: string, base: string): ParsedFeed {
  let raw: unknown;
  try {
    raw = JSON.parse(body);
  } catch {
    throw new FeedError("parse", "The feed is not valid JSON.");
  }

  if (!raw || typeof raw !== "object") {
    throw new FeedError("parse", "The JSON feed has no root object.");
  }

  const feed = raw as Record<string, unknown>;
  const itemsRaw = Array.isArray(feed.items) ? feed.items : [];
  const items: ParsedItem[] = itemsRaw
    .filter((item): item is Record<string, unknown> => {
      return Boolean(item && typeof item === "object");
    })
    .map((item) => {
      const authors = Array.isArray(item.authors) ? item.authors : [];
      const authorObject =
        authors[0] && typeof authors[0] === "object"
          ? (authors[0] as Record<string, unknown>)
          : item.author && typeof item.author === "object"
            ? (item.author as Record<string, unknown>)
            : undefined;
      const link = resolveUrl(
        typeof item.url === "string"
          ? item.url
          : typeof item.external_url === "string"
            ? item.external_url
            : null,
        base,
      );
      const html =
        typeof item.content_html === "string" ? item.content_html : undefined;
      const text =
        typeof item.content_text === "string"
          ? item.content_text
          : typeof item.summary === "string"
            ? item.summary
            : undefined;
      const imageValue =
        typeof item.image === "string"
          ? item.image
          : typeof item.banner_image === "string"
            ? item.banner_image
            : undefined;
      const image = resolveUrl(imageValue, link ?? base) ?? undefined;
      const publishedAt = firstValidDate([
        typeof item.date_published === "string"
          ? item.date_published
          : undefined,
        typeof item.date_modified === "string" ? item.date_modified : undefined,
      ]);
      const categories = Array.isArray(item.tags)
        ? item.tags.filter((tag): tag is string => typeof tag === "string")
        : [];

      return {
        id:
          typeof item.id === "string"
            ? item.id
            : (link ??
              (typeof item.title === "string" ? item.title : undefined)),
        title:
          typeof item.title === "string" ? plainText(item.title) : "Untitled",
        link: link ?? undefined,
        publishedAt,
        author:
          typeof authorObject?.name === "string"
            ? cleanAuthor(authorObject.name)
            : undefined,
        html,
        text,
        image,
        categories,
      };
    })
    .filter((item) => item.title || item.html || item.text || item.link);

  return {
    title:
      typeof feed.title === "string" ? plainText(feed.title) : "Untitled feed",
    siteUrl:
      resolveUrl(
        typeof feed.home_page_url === "string" ? feed.home_page_url : null,
        base,
      ) ?? undefined,
    description:
      typeof feed.description === "string"
        ? plainText(feed.description)
        : undefined,
    format: "json",
    items,
  };
}

/**
 * Parse RSS 2.0, Atom, RDF, or JSON Feed into one shape. The parser is
 * deliberately tolerant of missing fields but rejects malformed documents and
 * entity declarations outright.
 */
export function parseFeed(body: string, context: ParseContext): ParsedFeed {
  const source = body.replace(/^\uFEFF/, "").trim();
  if (!source) {
    throw new FeedError("parse", "The feed response was empty.");
  }

  const contentType = (context.contentType ?? "").toLowerCase();
  const looksJson = source.startsWith("{");
  if (contentType.includes("json") || looksJson) {
    return parseJsonFeed(source, context.feedUrl);
  }

  if (/<!ENTITY\b/i.test(source)) {
    throw new FeedError(
      "parse",
      "The feed contains XML entity declarations and was rejected.",
    );
  }

  let document: Document;
  try {
    document = new DOMParser().parseFromString(source, "application/xml");
  } catch {
    throw new FeedError("parse", "The feed is not valid XML.");
  }

  if (
    document.documentElement?.localName === "parsererror" ||
    document.getElementsByTagName("parsererror").length > 0
  ) {
    throw new FeedError("parse", "The feed is not valid XML.");
  }

  const rootName = document.documentElement?.localName?.toLowerCase();
  if (rootName === "rss") {
    return parseRss(document, context.feedUrl, "rss");
  }
  if (rootName === "rdf") {
    return parseRss(document, context.feedUrl, "rdf");
  }
  if (rootName === "feed") {
    return parseAtom(document, context.feedUrl);
  }

  throw new FeedError(
    "parse",
    "The response is XML, but not an RSS, Atom, RDF, or JSON feed.",
  );
}
