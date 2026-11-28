import { FeedError } from "./errors";
import { childElements, attribute, plainText } from "./xml";
import { feedTitleFromUrl, normalizeFeedUrl } from "./url";

export interface OpmlFeed {
  title: string;
  xmlUrl: string;
  htmlUrl?: string;
  folder?: string;
}

export interface OpmlResult {
  feeds: OpmlFeed[];
  skipped: number;
  invalid: number;
  duplicates: number;
}

function normalizeSiteUrl(value: string | undefined): string | undefined {
  if (!value) return undefined;
  return normalizeFeedUrl(value) ?? undefined;
}

function walk(
  parent: Element,
  folder: string | undefined,
  result: OpmlResult,
  seen: Set<string>,
): void {
  for (const outline of childElements(parent, "outline")) {
    const title = plainText(
      attribute(outline, "text") ?? attribute(outline, "title"),
    );
    const xmlUrl = attribute(outline, "xmlUrl");
    const type = attribute(outline, "type");

    if (xmlUrl) {
      if (type && !/^(?:rss|atom|feed)$/i.test(type)) {
        result.skipped += 1;
        continue;
      }

      const normalized = normalizeFeedUrl(xmlUrl);
      if (!normalized) {
        result.invalid += 1;
        continue;
      }
      if (seen.has(normalized)) {
        result.duplicates += 1;
        continue;
      }
      seen.add(normalized);

      result.feeds.push({
        title: title || feedTitleFromUrl(normalized),
        xmlUrl: normalized,
        htmlUrl: normalizeSiteUrl(attribute(outline, "htmlUrl")),
        folder,
      });
      continue;
    }

    walk(outline, title || folder, result, seen);
  }
}

/**
 * Read a FreshRSS/OPML export. Folders are flattened but their names are
 * preserved on each feed for a later folder pass. HTML+XPath outlines have no
 * direct feed URL and are reported as skipped rather than guessed at.
 */
export function parseOpml(xml: string): OpmlResult {
  let document: Document;
  try {
    document = new DOMParser().parseFromString(xml, "application/xml");
  } catch {
    throw new FeedError("parse", "The OPML file is not valid XML.");
  }

  if (
    document.documentElement?.localName === "parsererror" ||
    document.getElementsByTagName("parsererror").length > 0
  ) {
    throw new FeedError("parse", "The OPML file is not valid XML.");
  }

  const result: OpmlResult = {
    feeds: [],
    skipped: 0,
    invalid: 0,
    duplicates: 0,
  };

  const body = childElements(document.documentElement, "body")[0];
  walk(body ?? document.documentElement, undefined, result, new Set());

  return result;
}
