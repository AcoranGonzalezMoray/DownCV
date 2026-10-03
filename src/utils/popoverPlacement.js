export const POPOVER_GAP = 8;
export const POPOVER_MARGIN = 8;
export const POPOVER_FALLBACK_TOP = 88;
export const POPOVER_FALLBACK_LEFT = 16;

const hasArea = (rect) =>
  Boolean(rect) &&
  Number.isFinite(rect.top) &&
  Number.isFinite(rect.left) &&
  rect.width + rect.height > 0;

export function placePopover({
  rect = null,
  viewportWidth = 0,
  viewportHeight = 0,
  popoverWidth = 320,
  estimatedHeight = 400,
  gap = POPOVER_GAP,
  margin = POPOVER_MARGIN,
} = {}) {
  if (!hasArea(rect)) {
    return { top: POPOVER_FALLBACK_TOP, left: POPOVER_FALLBACK_LEFT };
  }
  const width = Math.max(0, Number(viewportWidth) || 0);
  const height = Math.max(0, Number(viewportHeight) || 0);

  const roomBelow = height - rect.bottom - gap;
  const roomAbove = rect.top - gap;
  const fitsBelow = roomBelow >= estimatedHeight;
  const top =
    fitsBelow || roomBelow >= roomAbove
      ? rect.bottom + gap
      : Math.max(margin, rect.top - estimatedHeight - gap);

  const maxLeft = Math.max(margin, width - popoverWidth - margin * 2);
  const left = Math.min(Math.max(margin, rect.left), maxLeft);

  return { top: Math.round(top), left: Math.round(left) };
}
