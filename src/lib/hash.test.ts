import { describe, expect, it } from "vitest";
import { hashString, mulberry32 } from "./hash";

describe("hashString", () => {
  it("is deterministic", () => {
    expect(hashString("inter-knot")).toBe(hashString("inter-knot"));
  });

  it("changes when the input changes", () => {
    expect(hashString("inter-knot")).not.toBe(hashString("inter-knots"));
  });

  it("returns an unsigned 32-bit integer", () => {
    const value = hashString("a much longer input with punctuation: [Post]");
    expect(Number.isInteger(value)).toBe(true);
    expect(value).toBeGreaterThanOrEqual(0);
    expect(value).toBeLessThan(2 ** 32);
  });
});

describe("mulberry32", () => {
  it("produces the same sequence for the same seed", () => {
    const first = mulberry32(42);
    const second = mulberry32(42);
    const a = Array.from({ length: 8 }, () => first());
    const b = Array.from({ length: 8 }, () => second());
    expect(a).toEqual(b);
  });

  it("stays within [0, 1)", () => {
    const random = mulberry32(7);
    for (let index = 0; index < 1000; index += 1) {
      const value = random();
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(1);
    }
  });
});
