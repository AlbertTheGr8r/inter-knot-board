import type { JournalEntry } from "../data/types";
import { readStored, writeStored } from "./idb-store";

export const JOURNAL_MAX_LENGTH = 4000;

const JOURNAL_KEY = "ik.journal.v1";

export interface JournalInput {
  articleId: string;
  body: string;
  articleTitle: string;
  feedTitle: string;
  articleLink?: string;
  articlePublishedAt: string;
}

function newId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `j${crypto.randomUUID()}`;
  }
  return `j${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}

/** Append one private note. Empty or whitespace-only notes are ignored. */
export function addJournalEntry(
  entries: JournalEntry[],
  input: JournalInput,
  now = new Date(),
): JournalEntry[] {
  const body = input.body.trim().slice(0, JOURNAL_MAX_LENGTH);
  if (!body) return entries;

  return [
    ...entries,
    {
      id: newId(),
      articleId: input.articleId,
      body,
      createdAt: now.toISOString(),
      articleTitle: input.articleTitle,
      feedTitle: input.feedTitle,
      articleLink: input.articleLink,
      articlePublishedAt: input.articlePublishedAt,
    },
  ];
}

export function removeJournalEntry(
  entries: JournalEntry[],
  id: string,
): JournalEntry[] {
  return entries.filter((entry) => entry.id !== id);
}

export function journalArticleIds(
  entries: JournalEntry[],
): ReadonlySet<string> {
  return new Set(entries.map((entry) => entry.articleId));
}

/** Oldest first, so the rail reads like a log. */
export function journalForArticle(
  entries: JournalEntry[],
  articleId: string,
): JournalEntry[] {
  return entries
    .filter((entry) => entry.articleId === articleId)
    .sort((a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt));
}

export function loadJournal(): Promise<JournalEntry[]> {
  return readStored<JournalEntry[]>(JOURNAL_KEY, []);
}

export function saveJournal(entries: JournalEntry[]): Promise<void> {
  return writeStored(JOURNAL_KEY, entries);
}
