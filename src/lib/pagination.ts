/**
 * Adaptive board pagination.
 *
 * "Five scrolls" is not a stable unit: a wheel notch varies by device and OS.
 * We use one board viewport as a screen instead, then work out how many cards
 * fill that much space across the current number of masonry columns.
 */

export interface BatchSizeOptions {
  columns: number;
  viewportHeight: number;
  averageCardHeight: number;
  gap: number;
  screens: number;
  min: number;
  max: number;
}

export const DEFAULT_SCREENS = 5;
export const MIN_BATCH = 8;
export const MAX_BATCH = 60;

export function computeBatchSize({
  columns,
  viewportHeight,
  averageCardHeight,
  gap,
  screens,
  min,
  max,
}: BatchSizeOptions): number {
  const safeColumns = Math.max(1, Math.floor(columns));
  const safeViewport = Math.max(1, viewportHeight);
  const safeCard = Math.max(1, averageCardHeight);
  const safeGap = Math.max(0, gap);
  const safeScreens = Math.max(1, screens);

  const perColumn = safeViewport / (safeCard + safeGap);
  const raw = Math.ceil(perColumn * safeColumns * safeScreens);

  return Math.max(min, Math.min(max, raw));
}
