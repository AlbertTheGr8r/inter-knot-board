/**
 * Column count from the available card area, matching the board reference:
 * target a ~310px card, never let a column exceed ~370px or fall below
 * ~285px, and allow up to eight columns on very wide displays.
 */
export interface ColumnOptions {
  idealCard?: number;
  maxCard?: number;
  minCard?: number;
  maxColumns?: number;
}

export function columnCountForWidth(
  width: number,
  gap: number,
  {
    idealCard = 310,
    maxCard = 370,
    minCard = 285,
    maxColumns = 8,
  }: ColumnOptions = {},
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

  while (
    columns > 1 &&
    (safeWidth - (columns - 1) * safeGap) / columns < minCard
  ) {
    columns -= 1;
  }

  return columns;
}
