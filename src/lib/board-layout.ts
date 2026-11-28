/**
 * Column count from the available card area, matching the board reference:
 * target a ~380px card, never let a column exceed ~400px, and allow up to
 * eight columns on very wide displays.
 */
export interface ColumnOptions {
  idealCard?: number;
  maxCard?: number;
  maxColumns?: number;
}

export function columnCountForWidth(
  width: number,
  gap: number,
  { idealCard = 380, maxCard = 400, maxColumns = 8 }: ColumnOptions = {},
): number {
  const safeWidth = Math.max(0, width);
  const safeGap = Math.max(0, gap);

  let columns = Math.round((safeWidth + safeGap) / (idealCard + safeGap));
  columns = Math.max(1, Math.min(maxColumns, columns));

  while (
    columns < maxColumns &&
    (safeWidth - (columns - 1) * safeGap) / columns > maxCard
  ) {
    columns += 1;
  }

  return columns;
}
