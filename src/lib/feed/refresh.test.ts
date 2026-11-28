import { describe, expect, it } from "vitest";
import type { Feed } from "../../data/types";
import { isFeedStale, mapWithConcurrency } from "./refresh";

const feed = (lastFetchedAt?: string, lastCheckedAt?: string): Feed => ({
  id: "f1",
  url: "https://example.com/feed",
  title: "Feed",
  color: "#fff",
  addedAt: "2025-01-01T00:00:00.000Z",
  lastFetchedAt,
  lastCheckedAt,
});

describe("isFeedStale", () => {
  const now = Date.parse("2025-01-01T12:00:00.000Z");

  it("treats a missing or invalid timestamp as stale", () => {
    expect(isFeedStale(feed(), now)).toBe(true);
    expect(isFeedStale(feed("nope"), now)).toBe(true);
  });

  it("uses the 15-minute default and respects a custom TTL", () => {
    expect(isFeedStale(feed("2025-01-01T11:50:00.000Z"), now)).toBe(false);
    expect(isFeedStale(feed("2025-01-01T11:40:00.000Z"), now)).toBe(true);
    expect(
      isFeedStale(feed("2025-01-01T11:50:00.000Z"), now, 5 * 60 * 1000),
    ).toBe(true);
  });

  it("uses the last attempt time so failures are not retried on every load", () => {
    expect(
      isFeedStale(
        feed("2025-01-01T10:00:00.000Z", "2025-01-01T11:55:00.000Z"),
        now,
      ),
    ).toBe(false);
  });
});

describe("mapWithConcurrency", () => {
  it("visits every item in order without exceeding the limit", async () => {
    let active = 0;
    let peak = 0;
    const seen: number[] = [];

    await mapWithConcurrency([1, 2, 3, 4, 5], 2, async (item) => {
      active += 1;
      peak = Math.max(peak, active);
      await Promise.resolve();
      seen.push(item);
      active -= 1;
    });

    expect(seen.sort((a, b) => a - b)).toEqual([1, 2, 3, 4, 5]);
    expect(peak).toBeLessThanOrEqual(2);
  });
});
