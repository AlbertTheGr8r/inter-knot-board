// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { FeedError } from "./errors";
import { parseFeed } from "./parse";

const RSS = `<?xml version="1.0"?>
<rss version="2.0" xmlns:content="http://purl.org/rss/1.0/modules/content/" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:media="http://search.yahoo.com/mrss/">
  <channel>
    <title>Sixth Street Signal</title>
    <link>https://example.com/</link>
    <item>
      <title>What's the best noodle shop?</title>
      <link>https://example.com/noodles</link>
      <guid isPermaLink="false">post-1</guid>
      <pubDate>Tue, 25 Nov 2025 10:00:00 GMT</pubDate>
      <dc:creator>WaterfallSoupFan</dc:creator>
      <category>Info</category>
      <description><![CDATA[<p>Eleven bowls later.</p><img src="/img/noodles.jpg" width="800" height="600">]]></description>
      <content:encoded><![CDATA[<p>Hello <strong>world</strong>.</p>]]></content:encoded>
      <media:thumbnail url="https://cdn.example.com/thumb.jpg" width="640" height="360" />
    </item>
  </channel>
</rss>`;

const ATOM = `<?xml version="1.0" encoding="utf-8"?>
<feed xmlns="http://www.w3.org/2005/Atom" xmlns:media="http://search.yahoo.com/mrss/">
  <title>Zenless Zone Zero News</title>
  <link href="https://example.com/" rel="alternate" type="text/html" />
  <author><name>Zenless Zone Zero</name></author>
  <entry>
    <id>tag:example.com,2025:1</id>
    <title>Agent Record</title>
    <link href="https://example.com/agent" rel="alternate" type="text/html" />
    <published>2025-11-28T03:00:04+00:00</published>
    <author><name>Hugie</name></author>
    <category term="Info" />
    <content type="html">&lt;p&gt;A clickbaity demon. &lt;script&gt;alert(1)&lt;/script&gt;&lt;/p&gt;&lt;img src="/img/agent.png" width="1200" height="800"&gt;</content>
  </entry>
</feed>`;

const YOUTUBE = `<?xml version="1.0" encoding="UTF-8"?>
<feed xmlns:yt="http://www.youtube.com/xml/schemas/2015" xmlns:media="http://search.yahoo.com/mrss/" xmlns="http://www.w3.org/2005/Atom">
  <title>Sebastian Lague</title>
  <link rel="alternate" href="https://www.youtube.com/channel/UCmtyQOKKmrMVaKuRXz02jbQ" />
  <entry>
    <id>yt:video:qyNWDzO6kKQ</id>
    <yt:videoId>qyNWDzO6kKQ</yt:videoId>
    <title>I Made a Pen Plotter</title>
    <link rel="alternate" href="https://www.youtube.com/watch?v=qyNWDzO6kKQ" />
    <published>2026-10-01T10:29:34+00:00</published>
    <author><name>Sebastian Lague</name></author>
    <media:group>
      <media:title>I Made a Pen Plotter</media:title>
      <media:thumbnail url="https://i2.ytimg.com/vi/qyNWDzO6kKQ/hqdefault.jpg" width="480" height="360" />
      <media:description>My attempt at a little pen plotter.</media:description>
    </media:group>
  </entry>
</feed>`;

const RDF = `<?xml version="1.0"?>
<rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#" xmlns="http://purl.org/rss/1.0/" xmlns:dc="http://purl.org/dc/elements/1.1/">
  <channel rdf:about="https://example.com/">
    <title>Old Feed</title>
    <link>https://example.com/</link>
  </channel>
  <item rdf:about="https://example.com/one">
    <title>An RDF post</title>
    <link>https://example.com/one</link>
    <dc:date>2025-01-02T03:04:05Z</dc:date>
    <description>Plain description.</description>
  </item>
</rdf:RDF>`;

const JSON_FEED = JSON.stringify({
  version: "https://jsonfeed.org/version/1.1",
  title: "JSON Board",
  home_page_url: "https://example.com/",
  items: [
    {
      id: "1",
      url: "https://example.com/post",
      title: "Hello JSON",
      content_html:
        '<p>Hello from JSON.</p><img src="/img/json.png" width="900" height="600">',
      date_published: "2025-06-01T00:00:00Z",
      authors: [{ name: "Ada" }],
      tags: ["Info"],
      image: "https://example.com/image.jpg",
    },
  ],
});

describe("parseFeed", () => {
  it("parses RSS with content, media image, author, and categories", () => {
    const feed = parseFeed(RSS, { feedUrl: "https://example.com/rss.xml" });

    expect(feed.format).toBe("rss");
    expect(feed.title).toBe("Sixth Street Signal");
    expect(feed.siteUrl).toBe("https://example.com/");
    expect(feed.items).toHaveLength(1);

    const item = feed.items[0]!;
    expect(item.title).toBe("What's the best noodle shop?");
    expect(item.link).toBe("https://example.com/noodles");
    expect(item.author).toBe("WaterfallSoupFan");
    expect(item.categories).toEqual(["Info"]);
    expect(item.html).toContain("Hello <strong>world</strong>");
    expect(item.image).toBe("https://cdn.example.com/thumb.jpg");
    expect(item.imageAspect).toBeCloseTo(640 / 360);
  });

  it("parses Atom content and resolves relative images against the entry link", () => {
    const feed = parseFeed(ATOM, { feedUrl: "https://example.com/atom.xml" });

    expect(feed.format).toBe("atom");
    expect(feed.title).toBe("Zenless Zone Zero News");
    expect(feed.items[0]?.html).toContain("<script>");
    expect(feed.items[0]?.link).toBe("https://example.com/agent");
    expect(feed.items[0]?.image).toBe("https://example.com/img/agent.png");
    expect(feed.items[0]?.imageAspect).toBeCloseTo(1.5);
  });

  it("parses YouTube Atom and uses the media thumbnail and description", () => {
    const feed = parseFeed(YOUTUBE, {
      feedUrl:
        "https://www.youtube.com/feeds/videos.xml?channel_id=UCmtyQOKKmrMVaKuRXz02jbQ",
    });

    const item = feed.items[0]!;
    expect(item.title).toBe("I Made a Pen Plotter");
    expect(item.link).toBe("https://www.youtube.com/watch?v=qyNWDzO6kKQ");
    expect(item.image).toBe(
      "https://i2.ytimg.com/vi/qyNWDzO6kKQ/hqdefault.jpg",
    );
    expect(item.imageAspect).toBeCloseTo(4 / 3);
    expect(item.text).toContain("little pen plotter");
    expect(item.author).toBe("Sebastian Lague");
  });

  it("parses RDF", () => {
    const feed = parseFeed(RDF, { feedUrl: "https://example.com/rdf.xml" });

    expect(feed.format).toBe("rdf");
    expect(feed.title).toBe("Old Feed");
    expect(feed.items[0]?.title).toBe("An RDF post");
    expect(feed.items[0]?.publishedAt).toBe("2025-01-02T03:04:05.000Z");
  });

  it("parses JSON Feed", () => {
    const feed = parseFeed(JSON_FEED, {
      feedUrl: "https://example.com/feed.json",
      contentType: "application/feed+json",
    });

    expect(feed.format).toBe("json");
    expect(feed.title).toBe("JSON Board");
    expect(feed.items[0]?.author).toBe("Ada");
    expect(feed.items[0]?.categories).toEqual(["Info"]);
    expect(feed.items[0]?.image).toBe("https://example.com/image.jpg");
  });

  it("rejects malformed XML", () => {
    expect(() =>
      parseFeed("<rss><channel>", { feedUrl: "https://example.com/rss" }),
    ).toThrow(FeedError);
  });

  it("rejects XML entity declarations", () => {
    expect(() =>
      parseFeed(
        '<!DOCTYPE rss [<!ENTITY laugh "hahaha">]><rss><channel><title>&laugh;</title></channel></rss>',
        { feedUrl: "https://example.com/rss" },
      ),
    ).toThrow(/entity/i);
  });

  it("rejects XML that is not a feed", () => {
    expect(() =>
      parseFeed("<root><item>No</item></root>", {
        feedUrl: "https://example.com/feed",
      }),
    ).toThrow(/not an RSS/);
  });
});
