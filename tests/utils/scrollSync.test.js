import { describe, it, expect } from 'vitest';
import {
  blockAtOffset,
  lineAtOffset,
  lineCount,
  offsetAtLine,
  offsetAtRatio,
  ratioAtOffset,
  scrollRatio,
} from '../../src/utils/scrollSync';

const MD = '# Ana\n\n## Experience\n\n- Led the migration\n\n## Education\n\n- BSc';

describe('scrollRatio', () => {
  it('reads how far the reader has gone through a scrollable pane', () => {
    expect(scrollRatio(0, 1000, 400)).toBe(0);
    expect(scrollRatio(300, 1000, 400)).toBeCloseTo(0.5, 5);
    expect(scrollRatio(600, 1000, 400)).toBe(1);
  });

  it('stays at the top when there is nothing to scroll', () => {
    expect(scrollRatio(0, 400, 400)).toBe(0);
    expect(scrollRatio(50, 0, 0)).toBe(0);
  });
});

describe('the position in the source', () => {
  it('is the same number whichever pane asked for it', () => {
    expect(offsetAtRatio(MD, 0)).toBe(0);
    expect(offsetAtRatio(MD, 0.5)).toBe(Math.round(MD.length / 2));
    expect(offsetAtRatio(MD, 1)).toBe(MD.length);
    expect(ratioAtOffset(MD, MD.length / 2)).toBeCloseTo(0.5, 5);
  });

  it('clamps a scroll past the end of the document', () => {
    expect(offsetAtRatio(MD, 4)).toBe(MD.length);
    expect(offsetAtRatio(MD, -1)).toBe(0);
    expect(ratioAtOffset(MD, -10)).toBe(0);
  });

  it('survives an empty document', () => {
    expect(offsetAtRatio('', 0.5)).toBe(0);
    expect(ratioAtOffset('', 5)).toBe(0);
  });
});

describe('lines of the source', () => {
  it('numbers them from zero and counts a break for every newline', () => {
    expect(lineAtOffset(MD, 0)).toBe(0);
    expect(lineAtOffset(MD, MD.indexOf('Experience'))).toBe(2);
    expect(lineAtOffset(MD, 9999)).toBe(8);
  });

  it('finds the offset a line starts at, so the textarea can be scrolled to it', () => {
    expect(offsetAtLine(MD, 0)).toBe(0);
    expect(offsetAtLine(MD, 2)).toBe(MD.indexOf('## Experience'));
    expect(offsetAtLine(MD, 99)).toBe(MD.length);
    expect(lineCount(MD)).toBe(9);
    expect(lineCount('')).toBe(1);
  });
});

describe('blockAtOffset', () => {
  const blocks = () => {
    const root = document.createElement('div');
    root.innerHTML =
      '<h1 data-cv-start="0" data-cv-end="4">A</h1><p data-cv-start="5" data-cv-end="12">B</p>';
    return root;
  };

  it('finds the block the reader is looking at, not the one after it', () => {
    expect(blockAtOffset(blocks(), 0)).toMatchObject({ start: 0, end: 4 });
    expect(blockAtOffset(blocks(), 6)).toMatchObject({ start: 5, end: 12 });
    expect(blockAtOffset(blocks(), 400)).toMatchObject({ start: 5, end: 12 });
  });

  it('says nothing when there is no preview to read', () => {
    expect(blockAtOffset(null, 3)).toBe(null);
    expect(blockAtOffset({}, 3)).toBe(null);
    expect(blockAtOffset(document.createElement('div'), 3)).toBe(null);
  });
});
