import { describe, expect, it } from "vitest";
import {
  MINDFUL_RECHARGE_GRACE_MS,
  createMindfulState,
  drainMindful,
  isMindfulEmpty,
  mindfulCapLabel,
  mindfulCapUnit,
  mindfulMinutesLeft,
  mindfulRatio,
  rechargeMindful,
  setMindfulCap,
  setMindfulMode,
} from "./mindful";

const NOW = new Date("2026-01-10T12:00:00.000Z").getTime();

describe("mindful timer", () => {
  it("starts full", () => {
    const state = createMindfulState(NOW, 30);
    expect(state.mode).toBe("mindful");
    expect(state.capMinutes).toBe(30);
    expect(state.remainingMs).toBe(30 * 60_000);
    expect(mindfulRatio(state)).toBe(1);
  });

  it("drains while on the board", () => {
    const state = drainMindful(createMindfulState(NOW, 30), 5 * 60_000, NOW);
    expect(mindfulMinutesLeft(state)).toBe(25);
    expect(mindfulRatio(state)).toBeCloseTo(25 / 30);
  });

  it("never drains below zero", () => {
    const state = drainMindful(createMindfulState(NOW, 15), 60 * 60_000, NOW);
    expect(state.remainingMs).toBe(0);
    expect(isMindfulEmpty(state)).toBe(true);
  });

  it("does not drain in unlimited mode", () => {
    const unlimited = setMindfulMode(
      createMindfulState(NOW, 30),
      "unlimited",
      NOW,
    );
    const state = drainMindful(unlimited, 60 * 60_000, NOW);
    expect(state.remainingMs).toBe(30 * 60_000);
    expect(isMindfulEmpty(state)).toBe(false);
  });

  it("ignores short absences during the grace period", () => {
    const state = rechargeMindful(
      createMindfulState(NOW, 30),
      MINDFUL_RECHARGE_GRACE_MS,
      NOW,
    );
    expect(state.remainingMs).toBe(30 * 60_000);
  });

  it("recharges after the grace period", () => {
    const drained = drainMindful(createMindfulState(NOW, 30), 20 * 60_000, NOW);
    const state = rechargeMindful(drained, 12 * 60_000, NOW);
    expect(mindfulMinutesLeft(state)).toBe(17);
  });

  it("caps recovery at the current cap", () => {
    const drained = drainMindful(createMindfulState(NOW, 30), 20 * 60_000, NOW);
    const state = rechargeMindful(drained, 12 * 60 * 60_000, NOW);
    expect(state.remainingMs).toBe(30 * 60_000);
  });

  it("resets to a new full cap", () => {
    const state = setMindfulCap(
      drainMindful(createMindfulState(NOW, 30), 10 * 60_000, NOW),
      45,
      NOW,
    );
    expect(state.capMinutes).toBe(45);
    expect(state.remainingMs).toBe(45 * 60_000);
  });

  it("labels the cap and remaining time", () => {
    const state = createMindfulState(NOW, 30);
    expect(mindfulCapLabel(state)).toBe("30");
    expect(mindfulCapUnit(state)).toBe("MIN");

    const unlimited = setMindfulMode(state, "unlimited", NOW);
    expect(mindfulCapLabel(unlimited)).toBe("∞");
    expect(mindfulCapUnit(unlimited)).toBe("OPEN");
  });
});
