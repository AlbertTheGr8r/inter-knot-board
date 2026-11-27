import { describe, expect, it } from "vitest";
import { isCardFullyVisible } from "./read-on-scroll";

describe("isCardFullyVisible", () => {
  it("requires the whole card when it fits in the reading area", () => {
    expect(
      isCardFullyVisible({
        cardHeight: 400,
        visibleHeight: 400,
        rootHeight: 800,
      }),
    ).toBe(true);
    expect(
      isCardFullyVisible({
        cardHeight: 400,
        visibleHeight: 399,
        rootHeight: 800,
      }),
    ).toBe(false);
  });

  it("accepts a tall card that fills the reading area", () => {
    expect(
      isCardFullyVisible({
        cardHeight: 1200,
        visibleHeight: 800,
        rootHeight: 800,
      }),
    ).toBe(true);
  });

  it("rejects empty or partial tall cards", () => {
    expect(
      isCardFullyVisible({
        cardHeight: 1200,
        visibleHeight: 500,
        rootHeight: 800,
      }),
    ).toBe(false);
    expect(
      isCardFullyVisible({
        cardHeight: 0,
        visibleHeight: 0,
        rootHeight: 800,
      }),
    ).toBe(false);
  });
});
