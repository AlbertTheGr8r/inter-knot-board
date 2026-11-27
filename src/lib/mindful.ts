/**
 * Mindful reading timer.
 *
 * The top bar used to show a level and an XP bar. It now shows the current
 * reading cap and the time left in the session. The timer only drains while
 * the board is visible and active; leaving the board recharges it after a
 * grace period so tab-switching is not an instant reset.
 *
 * The functions here are pure so the timer can be tested without a browser.
 */

export const MINDFUL_CAP_MINUTES = [15, 30, 45, 60, 90] as const;

export type MindfulMode = "mindful" | "unlimited";

export interface MindfulState {
  mode: MindfulMode;
  capMinutes: number;
  remainingMs: number;
  /** Last time the state was accounted for. */
  updatedAt: number;
}

export const DEFAULT_MINDFUL_CAP_MINUTES = 30;
export const MINDFUL_IDLE_MS = 60_000;
export const MINDFUL_RECHARGE_GRACE_MS = 5 * 60_000;
export const MINDFUL_TICK_MS = 15_000;

const MINUTE_MS = 60_000;

export function mindfulCapMs(state: MindfulState): number {
  return state.capMinutes * MINUTE_MS;
}

export function createMindfulState(
  now = Date.now(),
  capMinutes = DEFAULT_MINDFUL_CAP_MINUTES,
): MindfulState {
  return {
    mode: "mindful",
    capMinutes,
    remainingMs: capMinutes * MINUTE_MS,
    updatedAt: now,
  };
}

export function setMindfulCap(
  state: MindfulState,
  capMinutes: number,
  now = Date.now(),
): MindfulState {
  return {
    ...state,
    capMinutes,
    remainingMs: capMinutes * MINUTE_MS,
    updatedAt: now,
  };
}

export function setMindfulMode(
  state: MindfulState,
  mode: MindfulMode,
  now = Date.now(),
): MindfulState {
  return {
    ...state,
    mode,
    remainingMs: mindfulCapMs(state),
    updatedAt: now,
  };
}

/** Spend time on the board. Unlimited mode never drains. */
export function drainMindful(
  state: MindfulState,
  elapsedMs: number,
  now = Date.now(),
): MindfulState {
  if (state.mode === "unlimited" || elapsedMs <= 0) {
    return { ...state, updatedAt: now };
  }

  return {
    ...state,
    remainingMs: Math.max(0, state.remainingMs - elapsedMs),
    updatedAt: now,
  };
}

/**
 * Recharge after being away. The first few minutes are a grace period so
 * switching tabs does not refill the whole session.
 */
export function rechargeMindful(
  state: MindfulState,
  awayMs: number,
  now = Date.now(),
): MindfulState {
  if (state.mode === "unlimited" || awayMs <= MINDFUL_RECHARGE_GRACE_MS) {
    return { ...state, updatedAt: now };
  }

  const recovered = awayMs - MINDFUL_RECHARGE_GRACE_MS;
  return {
    ...state,
    remainingMs: Math.min(mindfulCapMs(state), state.remainingMs + recovered),
    updatedAt: now,
  };
}

export function mindfulRatio(state: MindfulState): number {
  if (state.mode === "unlimited") return 1;

  const cap = mindfulCapMs(state);
  if (cap <= 0) return 0;

  return Math.max(0, Math.min(1, state.remainingMs / cap));
}

export function mindfulMinutesLeft(state: MindfulState): number {
  return Math.max(0, Math.ceil(state.remainingMs / MINUTE_MS));
}

export function mindfulCapLabel(state: MindfulState): string {
  return state.mode === "unlimited" ? "∞" : String(state.capMinutes);
}

export function mindfulCapUnit(state: MindfulState): string {
  return state.mode === "unlimited" ? "OPEN" : "MIN";
}

export function mindfulRemainingLabel(state: MindfulState): string {
  if (state.mode === "unlimited") return "Unlimited reading";
  return `${mindfulMinutesLeft(state)}m left of ${state.capMinutes}m`;
}

export function isMindfulEmpty(state: MindfulState): boolean {
  return state.mode === "mindful" && state.remainingMs <= 0;
}
