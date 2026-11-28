import { createStore, get, set } from "idb-keyval";
import type { Article, Feed } from "../../data/types";

export type ArticleCache = Record<string, Article[]>;

export interface ReadingState {
  readIds: string[];
  starredIds: string[];
  openedAt: Record<string, number>;
}

export const MAX_ARTICLES_PER_FEED = 140;

export function emptyReadingState(): ReadingState {
  return { readIds: [], starredIds: [], openedAt: {} };
}

export function flattenCache(cache: ArticleCache): Article[] {
  return Object.values(cache)
    .flat()
    .sort((a, b) => Date.parse(b.publishedAt) - Date.parse(a.publishedAt));
}

export function applyReadingState(
  articles: Article[],
  state: ReadingState,
): Article[] {
  const read = new Set(state.readIds);
  const starred = new Set(state.starredIds);

  return articles.map((article) => ({
    ...article,
    unread: read.has(article.id) ? false : article.unread,
    starred: starred.has(article.id),
  }));
}

export function mergeArticles(
  existing: Article[],
  incoming: Article[],
  retainedIds: ReadonlySet<string>,
  max = MAX_ARTICLES_PER_FEED,
): Article[] {
  const merged = new Map<string, Article>();
  for (const article of existing) merged.set(article.id, article);
  for (const article of incoming) merged.set(article.id, article);

  const sorted = [...merged.values()].sort(
    (a, b) => Date.parse(b.publishedAt) - Date.parse(a.publishedAt),
  );
  if (sorted.length <= max) return sorted;

  const kept = sorted.slice(0, max);
  for (const article of sorted.slice(max)) {
    if (retainedIds.has(article.id)) kept.push(article);
  }

  return kept.sort(
    (a, b) => Date.parse(b.publishedAt) - Date.parse(a.publishedAt),
  );
}

export function pruneCache(
  cache: ArticleCache,
  retainedIds: ReadonlySet<string>,
  max = MAX_ARTICLES_PER_FEED,
): ArticleCache {
  const next: ArticleCache = {};
  for (const [feedId, articles] of Object.entries(cache)) {
    next[feedId] = mergeArticles([], articles, retainedIds, max);
  }
  return next;
}

const store = createStore("inter-knot-board", "feeds");

const FEEDS_KEY = "ik.feeds.v1";
const ARTICLES_KEY = "ik.articles.v1";
const READING_KEY = "ik.reading.v1";

async function readKey<T>(key: string, fallback: T): Promise<T> {
  try {
    return (await get<T>(key, store)) ?? fallback;
  } catch {
    return fallback;
  }
}

async function writeKey<T>(key: string, value: T): Promise<void> {
  try {
    await set(key, value, store);
  } catch {
    // Storage can be unavailable or full. The session still works.
  }
}

export function loadFeeds(): Promise<Feed[]> {
  return readKey<Feed[]>(FEEDS_KEY, []);
}

export function saveFeeds(feeds: Feed[]): Promise<void> {
  return writeKey(FEEDS_KEY, feeds);
}

export function loadArticleCache(): Promise<ArticleCache> {
  return readKey<ArticleCache>(ARTICLES_KEY, {});
}

export function saveArticleCache(cache: ArticleCache): Promise<void> {
  return writeKey(ARTICLES_KEY, cache);
}

export function loadReadingState(): Promise<ReadingState> {
  return readKey<ReadingState>(READING_KEY, emptyReadingState());
}

export function saveReadingState(state: ReadingState): Promise<void> {
  return writeKey(READING_KEY, state);
}
