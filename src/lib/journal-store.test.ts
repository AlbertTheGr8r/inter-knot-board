import { describe, expect, it } from "vitest";
import {
  addJournalEntry,
  journalArticleIds,
  journalForArticle,
  removeJournalEntry,
} from "./journal-store";

const input = {
  articleId: "a1",
  body: "  Remember this for later.  ",
  articleTitle: "A post",
  feedTitle: "A feed",
  articleLink: "https://example.com/post",
  articlePublishedAt: "2025-01-01T00:00:00.000Z",
};

describe("journal entries", () => {
  it("adds a trimmed private note with an article snapshot", () => {
    const entries = addJournalEntry(
      [],
      input,
      new Date("2025-02-01T00:00:00Z"),
    );

    expect(entries).toHaveLength(1);
    expect(entries[0]).toMatchObject({
      articleId: "a1",
      body: "Remember this for later.",
      articleTitle: "A post",
      feedTitle: "A feed",
      articleLink: "https://example.com/post",
      createdAt: "2025-02-01T00:00:00.000Z",
    });
    expect(entries[0]?.id).toMatch(/^j/);
  });

  it("ignores empty notes", () => {
    expect(addJournalEntry([], { ...input, body: "   " })).toHaveLength(0);
  });

  it("removes only the requested entry", () => {
    const entries = addJournalEntry([], input);
    expect(removeJournalEntry(entries, entries[0]!.id)).toHaveLength(0);
  });

  it("groups notes by article in log order", () => {
    const first = addJournalEntry([], input, new Date("2025-02-01T00:00:00Z"));
    const second = addJournalEntry(
      first,
      { ...input, body: "Later" },
      new Date("2025-02-02T00:00:00Z"),
    );
    const other = addJournalEntry(second, { ...input, articleId: "a2" });

    expect(journalForArticle(other, "a1").map((entry) => entry.body)).toEqual([
      "Remember this for later.",
      "Later",
    ]);
    expect([...journalArticleIds(other)]).toEqual(["a1", "a2"]);
  });
});
