const READ_ON_SCROLL_KEY = "ik.read-on-scroll.v1";
const COMPACT_KEY = "ik.compact.v1";

function loadBoolean(key: string): boolean {
  try {
    return localStorage.getItem(key) === "true";
  } catch {
    return false;
  }
}

function saveBoolean(key: string, value: boolean): void {
  try {
    localStorage.setItem(key, value ? "true" : "false");
  } catch {
    // Preferences are optional; a blocked storage API just means defaults.
  }
}

export function loadReadOnScroll(): boolean {
  return loadBoolean(READ_ON_SCROLL_KEY);
}

export function saveReadOnScroll(value: boolean): void {
  saveBoolean(READ_ON_SCROLL_KEY, value);
}

export function loadCompact(): boolean {
  return loadBoolean(COMPACT_KEY);
}

export function saveCompact(value: boolean): void {
  saveBoolean(COMPACT_KEY, value);
}
