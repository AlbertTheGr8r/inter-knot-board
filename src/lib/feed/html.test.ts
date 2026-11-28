// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import {
  estimateMinutes,
  extractFirstImage,
  paragraphsFromHtml,
  removeLeadImage,
  sanitizeArticleHtml,
  truncateText,
} from "./html";

describe("sanitizeArticleHtml", () => {
  it("removes scripts, event handlers, and unsafe URLs", () => {
    const clean = sanitizeArticleHtml(
      '<p onclick="steal()">Hello <a href="javascript:alert(1)">bad</a><script>alert(1)</script></p>',
      "https://example.com/post",
    );

    expect(clean).not.toContain("script");
    expect(clean).not.toContain("onclick");
    expect(clean).not.toContain("javascript:");
    expect(clean).toContain("Hello");
  });

  it("resolves safe links and images against the article URL", () => {
    const clean = sanitizeArticleHtml(
      '<p><a href="/next">Next</a><img src="/image.jpg" width="800" height="600"></p>',
      "https://example.com/posts/one",
    );

    expect(clean).toContain('href="https://example.com/next"');
    expect(clean).toContain('target="_blank"');
    expect(clean).toContain('rel="noopener noreferrer nofollow"');
    expect(clean).toContain('src="https://example.com/image.jpg"');
    expect(clean).toContain('loading="lazy"');
  });
});

describe("media helpers", () => {
  it("extracts the first real image and skips tracking pixels", () => {
    const image = extractFirstImage(
      '<img src="/tracker.gif" width="1" height="1"><img src="/lead.jpg" width="800" height="600">',
      "https://example.com/post",
    );

    expect(image?.url).toBe("https://example.com/lead.jpg");
    expect(image?.aspect).toBeCloseTo(800 / 600);
  });

  it("skips data URLs", () => {
    expect(
      extractFirstImage(
        '<img src="data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==">',
        "https://example.com/post",
      ),
    ).toBeUndefined();
  });

  it("removes only the lead image from the body", () => {
    const clean = removeLeadImage(
      '<img src="https://example.com/lead.jpg"><p>Body</p><img src="https://example.com/second.jpg">',
      "https://example.com/lead.jpg",
    );

    expect(clean).not.toContain("lead.jpg");
    expect(clean).toContain("second.jpg");
    expect(clean).toContain("Body");
  });

  it("splits block content into paragraphs", () => {
    expect(
      paragraphsFromHtml("<p>One</p><p>Two <strong>bold</strong></p>"),
    ).toEqual(["One", "Two bold"]);
  });

  it("truncates at a word boundary with an ellipsis", () => {
    const text = "word ".repeat(80);
    const truncated = truncateText(text, 40);
    expect(truncated.length).toBeLessThanOrEqual(41);
    expect(truncated.endsWith("…")).toBe(true);
  });

  it("estimates at least one minute", () => {
    expect(estimateMinutes("a few words")).toBe(1);
    expect(estimateMinutes("word ".repeat(440))).toBe(2);
  });
});
