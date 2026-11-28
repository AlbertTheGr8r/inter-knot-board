// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { parseOpml } from "./opml";

const OPML = `<?xml version="1.0" encoding="UTF-8"?>
<opml version="2.0">
  <head><title>FreshRSS</title></head>
  <body>
    <outline text="Games">
      <outline text="ZZZ News" type="rss" xmlUrl="https://feeds.example.com/zzz.xml" htmlUrl="https://example.com/zzz" />
      <outline text="HSR Leaks" type="rss" xmlUrl="https://www.reddit.com/r/example/.rss" />
    </outline>
    <outline text="Anime">
      <outline text="ANN" type="rss" xmlUrl="https://www.animenewsnetwork.com/all/rss.xml?ann-edition=sea" />
      <outline text="Scrape" type="HTML+XPath" xmlUrl="https://example.com/page" />
    </outline>
    <outline text="Duplicate" type="rss" xmlUrl="https://feeds.example.com/zzz.xml" />
    <outline text="Bad" type="rss" xmlUrl="ftp://example.com/feed" />
    <outline text="Bare" type="atom" xmlUrl="feeds.example.com/atom.xml" />
  </body>
</opml>`;

describe("parseOpml", () => {
  it("flattens folders, normalizes URLs, dedupes, and reports skips", () => {
    const result = parseOpml(OPML);

    expect(result.feeds.map((feed) => feed.title)).toEqual([
      "ZZZ News",
      "HSR Leaks",
      "ANN",
      "Bare",
    ]);
    expect(result.feeds[0]?.folder).toBe("Games");
    expect(result.feeds[0]?.xmlUrl).toBe("https://feeds.example.com/zzz.xml");
    expect(result.feeds[0]?.htmlUrl).toBe("https://example.com/zzz");
    expect(result.feeds[3]?.xmlUrl).toBe("https://feeds.example.com/atom.xml");
    expect(result.skipped).toBe(1);
    expect(result.invalid).toBe(1);
    expect(result.duplicates).toBe(1);
  });

  it("rejects malformed OPML", () => {
    expect(() => parseOpml("<opml><body>")).toThrow(/valid XML/);
  });
});
