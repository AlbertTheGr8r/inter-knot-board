import { describe, expect, it } from "vitest";
import {
  feedColorForUrl,
  feedIdForUrl,
  feedTitleFromUrl,
  normalizeFeedUrl,
} from "./url";

describe("normalizeFeedUrl", () => {
  it("adds HTTPS and strips fragments", () => {
    expect(normalizeFeedUrl("example.com/feed.xml#top")).toBe(
      "https://example.com/feed.xml",
    );
  });

  it("accepts feed:// and webcal:// aliases", () => {
    expect(normalizeFeedUrl("feed://example.com/rss")).toBe(
      "https://example.com/rss",
    );
    expect(normalizeFeedUrl("webcal://example.com/cal")).toBe(
      "https://example.com/cal",
    );
  });

  it("rejects non-HTTP schemes, embedded credentials, and spaces", () => {
    expect(normalizeFeedUrl("ftp://example.com/feed")).toBeNull();
    expect(normalizeFeedUrl("https://user:pass@example.com/feed")).toBeNull();
    expect(normalizeFeedUrl("   ")).toBeNull();
    expect(normalizeFeedUrl("not a url")).toBeNull();
    expect(normalizeFeedUrl("https://exa mple.com/feed")).toBeNull();
  });
});

describe("feed identity", () => {
  it("keeps IDs and colours stable for the same URL", () => {
    const url = "https://example.com/feed.xml";
    expect(feedIdForUrl(url)).toBe(feedIdForUrl(url));
    expect(feedColorForUrl(url)).toBe(feedColorForUrl(url));
  });

  it("falls back to the hostname for a missing title", () => {
    expect(feedTitleFromUrl("https://www.example.com/feed.xml")).toBe(
      "example.com",
    );
  });
});
