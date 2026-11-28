import { describe, expect, it } from "vitest";
import { mediaFadeState, mediaScrollState, postLayout } from "./post-layout";

describe("postLayout", () => {
  it("uses two columns without a third rail", () => {
    expect(postLayout(false, false)).toBe("two");
  });

  it("uses three columns for comments or journal entries", () => {
    expect(postLayout(true, false)).toBe("three");
    expect(postLayout(false, true)).toBe("three");
    expect(postLayout(true, true)).toBe("three");
  });
});

describe("mediaScrollState", () => {
  it("reports no scrolling when the image fits", () => {
    expect(mediaScrollState(0, 600, 600)).toEqual({
      scrollable: false,
      canScrollUp: false,
      canScrollDown: false,
    });
  });

  it("reports both directions in the middle of a long image", () => {
    expect(mediaScrollState(200, 600, 1400)).toEqual({
      scrollable: true,
      canScrollUp: true,
      canScrollDown: true,
    });
  });

  it("reports the edges correctly", () => {
    expect(mediaScrollState(0, 600, 1400)).toEqual({
      scrollable: true,
      canScrollUp: false,
      canScrollDown: true,
    });
    expect(mediaScrollState(800, 600, 1400)).toEqual({
      scrollable: true,
      canScrollUp: true,
      canScrollDown: false,
    });
  });
});

describe("mediaFadeState", () => {
  it("has no fades when the image fits", () => {
    expect(mediaFadeState(0, 600, 600)).toEqual({ top: 0, bottom: 0 });
  });

  it("ramps the top and bottom fades over the distance", () => {
    const start = mediaFadeState(0, 600, 1400, 48);
    expect(start.top).toBe(0);
    expect(start.bottom).toBe(1);

    const nearEnd = mediaFadeState(776, 600, 1400, 48);
    expect(nearEnd.top).toBe(1);
    expect(nearEnd.bottom).toBeCloseTo(0.5);

    const end = mediaFadeState(800, 600, 1400, 48);
    expect(end.top).toBe(1);
    expect(end.bottom).toBe(0);
  });
});
