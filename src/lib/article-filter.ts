import type { Article } from "../data/types";

export type Scope = "all" | "unread" | "read" | "journal";

export function matchesScope(
  article: Pick<Article, "id" | "unread">,
  scope: Scope,
  journalIds?: ReadonlySet<string>,
): boolean {
  if (scope === "unread") return article.unread;
  if (scope === "read") return !article.unread;
  if (scope === "journal") return journalIds?.has(article.id) ?? false;
  return true;
}

export function filterArticles(
  articles: Article[],
  scope: Scope,
  sourceId: string | null,
  journalIds?: ReadonlySet<string>,
): Article[] {
  return articles.filter((article) => {
    if (!matchesScope(article, scope, journalIds)) return false;
    if (sourceId && article.feedId !== sourceId) return false;
    return true;
  });
}
