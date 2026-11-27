import {
  createMindfulState,
  mindfulCapMs,
  rechargeMindful,
  type MindfulMode,
  type MindfulState,
} from "./mindful";

const STORAGE_KEY = "ik.mindful.v1";

function isCap(value: unknown): value is number {
  return (
    typeof value === "number" &&
    Number.isInteger(value) &&
    value >= 5 &&
    value <= 240
  );
}

function normalizeCap(value: unknown): number {
  if (isCap(value)) return value;
  return 30;
}

function normalizeMode(value: unknown): MindfulMode {
  return value === "unlimited" ? "unlimited" : "mindful";
}

/**
 * Restore the timer and account for the time spent away. `rechargeMindful`
 * applies the grace period, so a quick reload does not refill the board.
 */
export function loadMindfulState(now = Date.now()): MindfulState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return createMindfulState(now);

    const parsed = JSON.parse(raw) as Partial<MindfulState>;
    const capMinutes = normalizeCap(parsed.capMinutes);
    const mode = normalizeMode(parsed.mode);
    const base = createMindfulState(now, capMinutes);
    const remainingMs =
      typeof parsed.remainingMs === "number"
        ? Math.max(0, Math.min(mindfulCapMs(base), parsed.remainingMs))
        : mindfulCapMs(base);
    const updatedAt =
      typeof parsed.updatedAt === "number" && parsed.updatedAt > 0
        ? parsed.updatedAt
        : now;

    return rechargeMindful(
      { ...base, mode, remainingMs, updatedAt },
      Math.max(0, now - updatedAt),
      now,
    );
  } catch {
    return createMindfulState(now);
  }
}

export function saveMindfulState(state: MindfulState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Private mode and full quota are both fine; the timer just resets.
  }
}
