import { describe, expect, it } from "vitest";
import { columnCountForWidth } from "./board-layout";

describe("columnCountForWidth", () => {
  it("uses five columns at a 1920px board with the tuned gap", () => {
    expect(columnCountForWidth(1728, 38.4)).toBe(5);
  });

  it("uses four columns at 1600px", () => {
    expect(columnCountForWidth(1440, 32)).toBe(4);
  });

  it("uses three columns at 1280px", () => {
    expect(columnCountForWidth(1152, 28)).toBe(3);
  });

  it("uses two columns at 900px", () => {
    expect(columnCountForWidth(810, 28)).toBe(2);
  });

  it("uses six columns at 2400px", () => {
    expect(columnCountForWidth(2160, 40)).toBe(6);
  });

  it("reaches eight columns on a 3440px display", () => {
    expect(columnCountForWidth(3200, 40)).toBe(8);
  });

  it("falls back to one column on a phone", () => {
    expect(columnCountForWidth(342, 28)).toBe(1);
  });

  it("drops a column rather than going below the minimum card width", () => {
    expect(columnCountForWidth(540, 28)).toBe(1);
  });

  it("never returns zero columns", () => {
    expect(columnCountForWidth(0, 28)).toBe(1);
  });
});
