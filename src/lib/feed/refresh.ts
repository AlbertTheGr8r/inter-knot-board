import type { Feed } from "../../data/types";

export const FEED_REFRESH_TTL_MS = 15 * 60 * 1000;
export const REFRESH_CONCURRENCY = 3;

export function isFeedStale(
  feed: Feed,
  now = Date.now(),
  ttl = FEED_REFRESH_TTL_MS,
): boolean {
  const lastValue = feed.lastCheckedAt ?? feed.lastFetchedAt;
  if (!lastValue) return true;
  const last = Date.parse(lastValue);
  if (Number.isNaN(last)) return true;
  return now - last >= ttl;
}

export async function mapWithConcurrency<T>(
  items: T[],
  limit: number,
  worker: (item: T, index: number) => Promise<void>,
): Promise<void> {
  let next = 0;
  const size = Math.max(1, Math.min(limit, items.length));

  const run = async (): Promise<void> => {
    for (;;) {
      const index = next;
      next += 1;
      if (index >= items.length) return;
      await worker(items[index]!, index);
    }
  };

  await Promise.all(Array.from({ length: size }, run));
}
