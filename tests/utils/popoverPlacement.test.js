import { describe, it, expect } from 'vitest';
import { placePopover } from '../../src/utils/popoverPlacement';

const viewport = { viewportWidth: 1280, viewportHeight: 800 };
const rect = (top, left, width = 120, height = 18) => ({
  top,
  left,
  width,
  height,
  right: left + width,
  bottom: top + height,
});

describe('placePopover', () => {
  it('sits below the selection by default', () => {
    expect(placePopover({ rect: rect(200, 300), ...viewport })).toEqual({
      top: 226,
      left: 300,
    });
  });

  it('flips above the text when the bottom would clip', () => {
    const placed = placePopover({ rect: rect(700, 300), ...viewport });
    expect(placed.top).toBeLessThan(700);
    expect(placed.top).toBeGreaterThanOrEqual(8);
  });

  it('clamps a selection near the right edge back into view', () => {
    const placed = placePopover({ rect: rect(200, 1200), ...viewport });
    expect(placed.left + 320).toBeLessThanOrEqual(1280);
  });

  it('clamps a selection near the left edge away from the border', () => {
    const placed = placePopover({ rect: rect(200, 2), ...viewport });
    expect(placed.left).toBeGreaterThanOrEqual(8);
  });

  it('falls back to a fixed corner without a measurable rectangle', () => {
    expect(placePopover({ rect: null, ...viewport })).toEqual({ top: 88, left: 16 });
    expect(
      placePopover({ rect: rect(200, 300, 0, 0), ...viewport }),
    ).toEqual({ top: 88, left: 16 });
  });
});
