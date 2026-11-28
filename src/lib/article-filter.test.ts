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
    expect(
      articles.filter((item) => matchesScope(item, "unread")),
    ).toHaveLength(2);
    expect(articles.filter((item) => matchesScope(item, "read"))).toHaveLength(
      1,
    );
  });

  it("matches only articles with journal entries", () => {
    const journalIds = new Set(["a", "c"]);
    expect(
      articles.filter((item) => matchesScope(item, "journal", journalIds)),
    ).toHaveLength(2);
    expect(matchesScope(articles[1]!, "journal", journalIds)).toBe(false);
  });
});

describe("filterArticles", () => {
  it("combines scope and source", () => {
    expect(
      filterArticles(articles, "unread", "one").map((item) => item.id),
    ).toEqual(["a"]);
  });

  it("clears the source with null", () => {
    expect(filterArticles(articles, "all", null)).toHaveLength(3);
  });

  it("combines the journal scope with a source", () => {
    const journalIds = new Set(["a", "c"]);
    expect(
      filterArticles(articles, "journal", "one", journalIds).map(
        (item) => item.id,
      ),
    ).toEqual(["a"]);
  });
});
