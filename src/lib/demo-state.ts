import type { Article } from "../data/types";

/**
 * The v0.1 demo has no article store. This small localStorage record keeps
 * opened history, read overrides, and saved state across reloads until the
 * IndexedDB store lands with the real feed pipeline.
 */
const STORAGE_KEY = "ik.demo-state.v1";

export interface DemoState {
  readIds: string[];
  starredIds: string[];
  openedAt: Record<string, number>;
}

function isStringArray(value: unknown): value is string[] {
  return (
    Array.isArray(value) && value.every((item) => typeof item === "string")
  );
}

function isOpenedMap(value: unknown): value is Record<string, number> {
  return (
    typeof value === "object" &&
    value !== null &&
    Object.values(value).every(
      (item) => typeof item === "number" && Number.isFinite(item),
    )
  );
}

export function loadDemoState(): DemoState | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as Partial<DemoState>;
    if (
      !isStringArray(parsed.readIds) ||
      !isStringArray(parsed.starredIds) ||
      !isOpenedMap(parsed.openedAt)
    ) {
      return null;
    }

    return {
      readIds: parsed.readIds,
      starredIds: parsed.starredIds,
      openedAt: parsed.openedAt,
    };
  } catch {
    return null;
  }
}

export function saveDemoState(state: DemoState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // The demo still works for this session when storage is unavailable.
  }
}

export function applyDemoState(
  articles: Article[],
  state: DemoState | null,
): Article[] {
  if (!state) return articles;

  const read = new Set(state.readIds);
  const starred = new Set(state.starredIds);

  return articles.map((article) => ({
    ...article,
    unread: read.has(article.id) ? false : article.unread,
    starred: starred.has(article.id),
  }));
}
