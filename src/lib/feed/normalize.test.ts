// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import type { Feed } from "../../data/types";
import { normalizeFeed } from "./normalize";
import type { ParsedFeed } from "./parse-types";

const feed: Feed = {
  id: "fabc",
  url: "https://example.com/rss.xml",
  title: "Example Feed",
  siteUrl: "https://example.com/",
  color: "#f1d80a",
  addedAt: "2025-01-01T00:00:00.000Z",
};

const parsed: ParsedFeed = {
  title: "Example Feed",
  siteUrl: "https://example.com/",
  format: "rss",
  items: [
    {
      id: "guid-1",
      title: "A real post",
      link: "https://example.com/post",
      publishedAt: "2025-06-01T00:00:00.000Z",
      author: "Ada",
      html: '<p>Hello <strong>world</strong>.</p><script>alert(1)</script><p><a href="/next">Next</a></p><img src="/lead.jpg" width="800" height="500">',
      categories: ["Info"],
    },
  ],
};

describe("normalizeFeed", () => {
  it("sanitizes HTML, resolves URLs, and extracts the lead image", () => {
    const [article] = normalizeFeed(parsed, feed, "2025-06-02T00:00:00.000Z");

    expect(article?.contentHtml).not.toContain("script");
    expect(article?.contentHtml).toContain('href="https://example.com/next"');
    expect(article?.contentHtml).toContain('target="_blank"');
    expect(article?.image).toBe("https://example.com/lead.jpg");
    expect(article?.imageAspect).toBeCloseTo(1.6);
    expect(article?.tag).toBe("Info");
    expect(article?.minutes).toBeGreaterThanOrEqual(1);
  });

  it("keeps IDs stable across refreshes and date updates", () => {
    const first = normalizeFeed(parsed, feed, "2025-06-02T00:00:00.000Z");
    const second = normalizeFeed(parsed, feed, "2025-06-03T00:00:00.000Z");
    const updatedDate = normalizeFeed(
      {
        ...parsed,
        items: [
          { ...parsed.items[0]!, publishedAt: "2025-06-05T00:00:00.000Z" },
        ],
      },
      feed,
      "2025-06-03T00:00:00.000Z",
    );

    expect(first[0]?.id).toBe(second[0]?.id);
    expect(first[0]?.id).toBe(updatedDate[0]?.id);
  });

  it("falls back to the feed title for a missing author", () => {
    const [article] = normalizeFeed(
      { ...parsed, items: [{ ...parsed.items[0]!, author: undefined }] },
      feed,
      "2025-06-02T00:00:00.000Z",
    );

    expect(article?.author).toBe("Example Feed");
  });

  it("uses the fetched time when a post has no date", () => {
    const [article] = normalizeFeed(
      { ...parsed, items: [{ ...parsed.items[0]!, publishedAt: undefined }] },
      feed,
      "2025-06-02T00:00:00.000Z",
    );

    expect(article?.publishedAt).toBe("2025-06-02T00:00:00.000Z");
  });

  it("marks leak feeds as Intel and release feeds as Release", () => {
    const leaks: Feed = {
      ...feed,
      url: "https://example.com/leaks.xml",
      title: "Leaks",
    };
    const releases: Feed = {
      ...feed,
      url: "https://github.com/example/project/releases.atom",
      title: "Releases",
    };
    const item = { ...parsed.items[0]!, categories: [] };

    expect(
      normalizeFeed(
        { ...parsed, items: [item] },
        leaks,
        "2025-06-02T00:00:00.000Z",
      )[0]?.tag,
    ).toBe("Intel");
    expect(
      normalizeFeed(
        { ...parsed, items: [item] },
        releases,
        "2025-06-02T00:00:00.000Z",
      )[0]?.tag,
    ).toBe("Release");
  });
});
