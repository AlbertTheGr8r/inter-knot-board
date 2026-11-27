import { describe, expect, it } from "vitest";
import type { Article } from "../data/types";
import { filterArticles, matchesScope } from "./article-filter";

const article = (id: string, unread: boolean, feedId: string): Article =>
  ({
    id,
    feedId,
    unread,
  }) as Article;

const articles = [
  article("a", true, "one"),
  article("b", false, "one"),
  article("c", true, "two"),
];

describe("matchesScope", () => {
  it("matches everything in the all scope", () => {
    expect(articles.every((item) => matchesScope(item, "all"))).toBe(true);
  });

  it("matches unread and read separately", () => {
    expect(articles.filter((item) => matchesScope(item, "unread"))).toHaveLength(
      2,
    );
    expect(articles.filter((item) => matchesScope(item, "read"))).toHaveLength(
      1,
    );
  });
});

describe("filterArticles", () => {
  it("combines scope and source", () => {
    expect(filterArticles(articles, "unread", "one").map((item) => item.id)).toEqual(
      ["a"],
    );
  });

  it("clears the source with null", () => {
    expect(filterArticles(articles, "all", null)).toHaveLength(3);
  });
});
