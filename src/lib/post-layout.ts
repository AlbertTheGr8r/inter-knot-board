export type PostLayout = "two" | "three";

export function postLayout(
  hasComments: boolean,
  hasJournal: boolean,
): PostLayout {
  return hasComments || hasJournal ? "three" : "two";
}

export interface MediaScrollState {
  scrollable: boolean;
  canScrollUp: boolean;
  canScrollDown: boolean;
}

export function mediaScrollState(
  scrollTop: number,
  clientHeight: number,
  scrollHeight: number,
  threshold = 2,
): MediaScrollState {
  const max = Math.max(0, scrollHeight - clientHeight);
  return {
    scrollable: max > threshold,
    canScrollUp: scrollTop > threshold,
    canScrollDown: scrollTop < max - threshold,
  };
}

export interface MediaFadeState {
  top: number;
  bottom: number;
}

/**
 * Continuous fade opacity, so the gradients ramp in and out rather than
 * snapping at the first or last scrolled pixel.
 */
export function mediaFadeState(
  scrollTop: number,
  clientHeight: number,
  scrollHeight: number,
  distance = 48,
): MediaFadeState {
  const max = Math.max(0, scrollHeight - clientHeight);
  if (max <= 0) return { top: 0, bottom: 0 };

  const ramp = Math.max(1, distance);
  return {
    top: Math.min(1, Math.max(0, scrollTop / ramp)),
    bottom: Math.min(1, Math.max(0, (max - scrollTop) / ramp)),
  };
}
