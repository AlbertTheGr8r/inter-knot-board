import { describe, expect, it } from "vitest";
import { initials, relativeTime } from "./format";

const NOW = new Date("2026-01-10T12:00:00.000Z").getTime();
const ago = (milliseconds: number): string =>
  new Date(NOW - milliseconds).toISOString();

describe("relativeTime", () => {
  it("shows 'now' for the last minute", () => {
    expect(relativeTime(ago(10_000), NOW)).toBe("now");
  });

  it("shows minutes under an hour", () => {
    expect(relativeTime(ago(5 * 60_000), NOW)).toBe("5m");
  });

  it("shows hours under a day", () => {
    expect(relativeTime(ago(2 * 3_600_000), NOW)).toBe("2h");
  });

  it("shows days under a week", () => {
    expect(relativeTime(ago(3 * 86_400_000), NOW)).toBe("3d");
  });

  it("falls back to a date for older posts", () => {
    const value = relativeTime(ago(30 * 86_400_000), NOW);
    expect(value.length).toBeGreaterThan(0);
    expect(value).not.toMatch(/d$/);
  });

  it("returns an empty string for an invalid date", () => {
    expect(relativeTime("not-a-date", NOW)).toBe("");
  });
});

describe("initials", () => {
  it("uses the first letter of a single word", () => {
    expect(initials("WaterfallSoupFan")).toBe("W");
  });

  it("uses two words", () => {
    expect(initials("Hollow Weekly")).toBe("HW");
  });

  it("treats hyphens as word breaks", () => {
    expect(initials("Inter-Knot Team")).toBe("IK");
  });

  it("handles underscores", () => {
    expect(initials("night_shift_noodles")).toBe("NS");
  });

  it("falls back for empty input", () => {
    expect(initials("!!!")).toBe("IK");
  });
});
