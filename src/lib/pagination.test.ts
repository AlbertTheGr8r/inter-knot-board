import { describe, expect, it } from "vitest";
import { computeBatchSize } from "./pagination";

const base = {
  viewportHeight: 900,
  averageCardHeight: 436,
  gap: 16,
  screens: 5,
  min: 8,
  max: 60,
};

describe("computeBatchSize", () => {
  it("loads more cards when there are more columns", () => {
    expect(computeBatchSize({ ...base, columns: 4 })).toBe(40);
    expect(computeBatchSize({ ...base, columns: 1 })).toBe(10);
  });

  it("clamps tiny boards to the minimum", () => {
    expect(
      computeBatchSize({
        ...base,
        columns: 1,
        viewportHeight: 200,
        min: 12,
      }),
    ).toBe(12);
  });

  it("clamps huge batches to the maximum", () => {
    expect(
      computeBatchSize({
        ...base,
        columns: 8,
        averageCardHeight: 100,
        max: 60,
      }),
    ).toBe(60);
  });

  it("treats invalid measurements as a single usable column", () => {
    expect(
      computeBatchSize({
        ...base,
        columns: 0,
        averageCardHeight: 0,
        viewportHeight: 0,
        min: 1,
      }),
    ).toBe(1);
  });
});
