import { describe, it, expect } from 'vitest';
import {
  contentHeightFor,
  keepsWithNext,
  planPages,
  splitTopLevelHtml,
  PAGE_HEIGHT_PX,
} from '../../src/utils/paginate';

describe('splitTopLevelHtml', () => {
  it('cuts the flat list of blocks the preview renders', () => {
    const chunks = splitTopLevelHtml(
      '<h1 class="cv-name">Ana</h1>\n<h3 class="cv-section-title">X</h3>\n<p>Body</p>\n',
    );
    expect(chunks).toHaveLength(3);
    expect(chunks[0]).toBe('<h1 class="cv-name">Ana</h1>');
    expect(chunks[2]).toBe('<p>Body</p>');
  });

  it('never cuts a list in half, so a bullet keeps the job it belongs to', () => {
    const html =
      '<ul class="cv-list" data-cv-start="10" data-cv-end="80">\n<li>One</li>\n<li>Two</li>\n</ul>\n<p>After</p>\n';
    const chunks = splitTopLevelHtml(html);
    expect(chunks).toHaveLength(2);
    expect(chunks[0]).toContain('<li>Two</li>');
    expect(chunks[1]).toBe('<p>After</p>');
  });

  it('reads the attributes of a tag as part of the tag', () => {
    const chunks = splitTopLevelHtml(
      '<div class="cv-entry-title" data-cv-start="0" data-cv-end="9">Role</div>\n<p>b</p>',
    );
    expect(chunks).toHaveLength(2);
  });

  it('keeps a self closing block as a chunk of its own', () => {
    const chunks = splitTopLevelHtml(
      '<div class="cv-separator" data-cv-start="0"></div>\n<p>x</p>',
    );
    expect(chunks).toHaveLength(2);
  });

  it('returns nothing for an empty document, and the planner still has a page', () => {
    expect(splitTopLevelHtml('')).toEqual([]);
    expect(planPages([], { contentHeight: 500 })).toEqual([[]]);
  });
});

describe('planPages', () => {
  const advances = [300, 300, 300, 300];

  it('keeps everything on one sheet while it fits', () => {
    expect(planPages(advances, { contentHeight: 1300 })).toEqual([[0, 1, 2, 3]]);
  });

  it('starts a new sheet on the block that no longer fits', () => {
    expect(planPages(advances, { contentHeight: 700 })).toEqual([
      [0, 1],
      [2, 3],
    ]);
  });

  it('puts a heading at the top of a sheet instead of the bottom of the previous one', () => {
    
    expect(planPages(advances, { contentHeight: 700, keepWithNext: [false, false, true] })).toEqual(
      [
        [0, 1],
        [2, 3],
      ],
    );
  });

  it('never empties a sheet to satisfy the keep together rule', () => {
    
    expect(planPages(advances, { contentHeight: 320, keepWithNext: [true] })).toEqual([
      [0],
      [1],
      [2],
      [3],
    ]);
  });

  it('loses no block at all, whatever the keep together rule asks for', () => {
    const plan = planPages([380, 380, 380, 0], {
      contentHeight: 700,
      keepWithNext: [true, true, false, false],
    });
    expect(plan.flat().sort((a, b) => a - b)).toEqual([0, 1, 2, 3]);
  });

  it('lets a single block bigger than a sheet overflow it instead of looping', () => {
    expect(planPages([5000, 100], { contentHeight: 500 })).toEqual([[0], [1]]);
  });

  it('treats a missing measurement as no space rather than as NaN', () => {
    expect(planPages([100, undefined, 100], { contentHeight: 200 })).toEqual([[0, 1, 2]]);
  });
});

describe('the A4 sheet', () => {
  it('is 297mm tall once the paper margins are taken off it', () => {
    expect(contentHeightFor(24)).toBeCloseTo(PAGE_HEIGHT_PX - 48, 5);
    expect(contentHeightFor(0)).toBeCloseTo(PAGE_HEIGHT_PX, 5);
  });

  it('always leaves a page, even with margins bigger than the sheet', () => {
    expect(contentHeightFor(5000)).toBe(1);
  });

  it('knows which blocks may not be orphaned at the bottom of a page', () => {
    expect(keepsWithNext('<h3 class="cv-section-title">X</h3>')).toBe(true);
    expect(keepsWithNext('<div class="cv-entry-title">X</div>')).toBe(true);
    expect(keepsWithNext('<p>text</p>')).toBe(false);
    expect(keepsWithNext('<ul class="cv-list"><li>a</li></ul>')).toBe(false);
  });
});
