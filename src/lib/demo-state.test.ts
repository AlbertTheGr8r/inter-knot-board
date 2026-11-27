import { describe, expect, it } from "vitest";
import type { Article } from "../data/types";
import { applyDemoState, type DemoState } from "./demo-state";

const article = (id: string, unread: boolean, starred: boolean): Article =>
  ({ id, unread, starred }) as Article;

describe("applyDemoState", () => {
  it("leaves demo defaults alone without a saved state", () => {
    const articles = [article("a", true, false), article("b", false, true)];
    expect(applyDemoState(articles, null)).toEqual(articles);
  });

  it("applies read overrides and exact saved state", () => {
    const articles = [
      article("a", true, false),
      article("b", false, true),
      article("c", true, false),
    ];
    const state: DemoState = {
      readIds: ["a"],
      starredIds: ["c"],
      openedAt: { a: 123 },
    };

    const result = applyDemoState(articles, state);
    expect(result.map((item) => [item.id, item.unread, item.starred])).toEqual([
      ["a", false, false],
      ["b", false, false],
      ["c", true, true],
    ]);
  });
});
