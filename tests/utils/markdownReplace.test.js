import { describe, it, expect } from 'vitest';
import { replaceRange } from '../../src/utils/markdownFormat';

const MD = '# Ana Gomez\n\n- Led the migration that cut deploys by 45%\n';

describe('replaceRange', () => {
  it('swaps the selected slice for the new text', () => {
    const start = MD.indexOf('Led the migration');
    const result = replaceRange(MD, { start, end: start + 3 }, 'Directed');
    expect(result.markdown).toContain('Directed the migration');
    expect(result.markdown).not.toContain('Led the migration');
    expect(result.range).toEqual(
      expect.objectContaining({ start, end: start + 'Directed'.length }),
    );
  });

  it('clamps a selection that runs past the document', () => {
    const result = replaceRange(MD, { start: 0, end: 99999 }, 'New');
    expect(result.markdown).toBe('New');
    expect(result.range).toEqual(expect.objectContaining({ start: 0, end: 3 }));
  });

  it('inserts at the caret when the selection is collapsed', () => {
    const result = replaceRange(MD, { start: 5, end: 5 }, '!');
    expect(result.markdown).toBe(`${MD.slice(0, 5)}!${MD.slice(5)}`);
    expect(result.range).toEqual(expect.objectContaining({ start: 5, end: 6 }));
  });

  it('refuses a range that is not a range', () => {
    expect(replaceRange(MD, null, 'x')).toBe(null);
    expect(replaceRange(MD, { start: NaN, end: 2 }, 'x')).toBe(null);
  });
});
