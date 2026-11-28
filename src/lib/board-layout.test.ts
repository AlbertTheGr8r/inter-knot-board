import { describe, expect, it } from "vitest";
import { columnCountForWidth } from "./board-layout";

describe("columnCountForWidth", () => {
  it("uses four columns at a 1600px board with reference padding", () => {
    expect(columnCountForWidth(1440, 37)).toBe(4);
  });

  it("uses three columns at 1280px", () => {
    expect(columnCountForWidth(1152, 30)).toBe(3);
  });

  it("uses five columns at 2400px", () => {
    expect(columnCountForWidth(2160, 56)).toBe(5);
  });

  it("reaches eight columns on a 3440px display", () => {
    expect(columnCountForWidth(3200, 56)).toBe(8);
  });

  it("falls back to one column on a phone", () => {
    expect(columnCountForWidth(351, 24)).toBe(1);
  });

  it("never returns zero columns", () => {
    expect(columnCountForWidth(0, 24)).toBe(1);
  });
});
