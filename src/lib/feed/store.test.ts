import { describe, expect, it } from "vitest";
import type { Article } from "../../data/types";
import {
  applyReadingState,
  emptyReadingState,
  flattenCache,
  mergeArticles,
  pruneCache,
} from "./store";

const article = (id: string, date: string): Article =>
  ({
    id,
    publishedAt: date,
    unread: true,
    starred: false,
  }) as Article;

describe("applyReadingState", () => {
  it("applies read and starred state without changing the feed data", () => {
    const articles = [article("a", "2025-01-01"), article("b", "2025-01-02")];
    const state = {
      ...emptyReadingState(),
      readIds: ["a"],
      starredIds: ["b"],
    };

    expect(
      applyReadingState(articles, state).map((item) => [
        item.id,
        item.unread,
        item.starred,
      ]),
    ).toEqual([
      ["a", false, false],
      ["b", true, true],
    ]);
  });
});

describe("mergeArticles", () => {
  it("adds new items, refreshes existing ones, and sorts newest first", () => {
    const existing = [article("a", "2025-01-01"), article("b", "2025-01-02")];
    const incoming = [article("b", "2025-01-03"), article("c", "2025-01-04")];

    const merged = mergeArticles(existing, incoming, new Set());
    expect(merged.map((item) => item.id)).toEqual(["c", "b", "a"]);
    expect(merged[1]?.publishedAt).toBe("2025-01-03");
  });

  it("keeps saved or opened items beyond the per-feed cap", () => {
    const articles = Array.from({ length: 6 }, (_, index) =>
      article(`a${index}`, `2025-01-0${index + 1}`),
    );

    const merged = mergeArticles([], articles, new Set(["a0"]), 3);
    expect(merged.map((item) => item.id)).toEqual(["a5", "a4", "a3", "a0"]);
  });
});

describe("cache helpers", () => {
  it("flattens feeds newest first", () => {
    const cache = {
      one: [article("a", "2025-01-01")],
      two: [article("b", "2025-01-02")],
    };

    expect(flattenCache(cache).map((item) => item.id)).toEqual(["b", "a"]);
  });

  it("prunes each feed while retaining ids", () => {
    const cache = {
      one: [
        article("a", "2025-01-01"),
        article("b", "2025-01-02"),
        article("c", "2025-01-03"),
        article("d", "2025-01-04"),
      ],
    };

    const pruned = pruneCache(cache, new Set(["a"]), 2);
    expect(pruned.one?.map((item) => item.id)).toEqual(["d", "c", "a"]);
  });
});
