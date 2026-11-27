import type { Article } from "../data/types";

export type Scope = "all" | "unread" | "read";

export function matchesScope(
  article: Pick<Article, "unread">,
  scope: Scope,
): boolean {
  if (scope === "unread") return article.unread;
  if (scope === "read") return !article.unread;
  return true;
}

export function filterArticles(
  articles: Article[],
  scope: Scope,
  sourceId: string | null,
): Article[] {
  return articles.filter((article) => {
    if (!matchesScope(article, scope)) return false;
    if (sourceId && article.feedId !== sourceId) return false;
    return true;
  });
}
