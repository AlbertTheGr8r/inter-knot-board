/**
 * Read-on-scroll is a heuristic, not a fact. A card counts as seen only when
 * its full height is inside the reading area, or — for cards taller than the
 * area — when it covers the whole area.
 */
export const READ_ON_SCROLL_DWELL_MS = 1500;

export function isCardFullyVisible({
  cardHeight,
  visibleHeight,
  rootHeight,
}: {
  cardHeight: number;
  visibleHeight: number;
  rootHeight: number;
}): boolean {
  const required = Math.min(cardHeight, rootHeight);
  if (required <= 0 || visibleHeight <= 0) return false;

  return visibleHeight >= required - 0.5;
}
