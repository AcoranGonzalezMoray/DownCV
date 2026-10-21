import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, cleanup, fireEvent } from '@testing-library/react';
import CVPreview from '../../src/components/CVPreview';
import MarkdownEditor from '../../src/components/MarkdownEditor';
import { translations } from '../../src/data/translations';

const styles = {
  fontFamily: 'Inter, sans-serif',
  fontSize: 13,
  lineHeight: 1.48,
  marginX: 28,
  marginY: 24,
  sectionGap: 16,
  itemGap: 10,
  primaryColor: '#111',
  textColor: '#111',
  subtextColor: '#555',
  borderStyle: 'line',
  bulletStyle: '•',
};

const MD = '# Ana Gomez\n\n## WORK EXPERIENCE\n\n- Did things';

const noop = () => {};

const renderPreview = (onPickRange, markdown = MD) =>
  render(
    <CVPreview
      markdown={markdown}
      setMarkdown={noop}
      styles={styles}
      t={translations.en}
      undo={noop}
      redo={noop}
      canUndo={false}
      canRedo={false}
      onPickRange={onPickRange}
    />,
  );

const selectIn = (element, start, end) => {
  const node = element.firstChild;
  const range = document.createRange();
  range.setStart(node, start);
  range.setEnd(node, end);
  const selection = window.getSelection();
  selection.removeAllRanges();
  selection.addRange(range);
  return range;
};

describe('the preview tells the editor what was picked', () => {
  afterEach(() => cleanup());

  it('reports the word that was clicked', () => {
    const onPickRange = vi.fn();
    renderPreview(onPickRange);

    const title = document.querySelector('.cv-section-title');
    selectIn(title, 0, 0);
    fireEvent.mouseUp(document.querySelector('.cv-paper-container'));

    expect(onPickRange).toHaveBeenCalledWith({ start: 16, end: 20, focus: 16 });
  });

  it('reports the phrase that was selected', () => {
    const onPickRange = vi.fn();
    renderPreview(onPickRange);

    const name = document.querySelector('.cv-name');
    selectIn(name, 0, 3);
    fireEvent.mouseUp(document.querySelector('.cv-paper-container'));

    expect(onPickRange).toHaveBeenCalledWith({ start: 2, end: 5, focus: 2 });
  });

  it('says nothing when a link is clicked', () => {
    const onPickRange = vi.fn();
    renderPreview(onPickRange, '# Ana\n\n[my site](https://ana.dev)');

    const link = document.querySelector('.cv-paper a');
    selectIn(link, 0, 0);
    fireEvent.mouseUp(link);

    expect(onPickRange).not.toHaveBeenCalled();
  });

  it('tells where the pointer was, when the selection spans several blocks', () => {    const onPickRange = vi.fn();
    renderPreview(onPickRange);

    const title = document.querySelector('.cv-section-title');
    const item = document.querySelector('.cv-paper li');
    const range = document.createRange();
    range.setStart(title.firstChild, 0);
    range.setEnd(item.firstChild, 3);
    const selection = window.getSelection();
    selection.removeAllRanges();
    selection.addRange(range);

    fireEvent.mouseUp(document.querySelector('.cv-paper-container'));

    const picked = onPickRange.mock.calls.at(-1)[0];
    expect(picked.start).toBeLessThan(picked.focus);
    expect(MD.slice(picked.focus, picked.focus + 3)).toBe('Did');
  });

  it('selects only the word when it is double clicked, without the space behind it', () => {
    const onPickRange = vi.fn();
    renderPreview(onPickRange, '# Ana\n\n- Did things here');

    const item = document.querySelector('.cv-paper li');
    const node = item.firstChild;
    const range = document.createRange();
    range.setStart(node, 0);
    range.setEnd(node, 4);
    const selection = window.getSelection();
    selection.removeAllRanges();
    selection.addRange(range);
    expect(selection.toString()).toBe('Did ');

    fireEvent.doubleClick(item);

    expect(selection.toString()).toBe('Did');
    const picked = onPickRange.mock.calls.at(-1)[0];
    expect(picked.start).toBe(9);
    expect(picked.end).toBe(12);
  });
});

describe('the editor highlights what was picked in the preview', () => {
  afterEach(() => cleanup());

  const renderEditor = (highlightRange) =>
    render(
      <MarkdownEditor
        markdown={MD}
        setMarkdown={noop}
        sampleCVs={[]}
        lang="en"
        onSelectSample={noop}
        wordCount={10}
        savedDrafts={[]}
        onSaveDraft={noop}
        currentDraftName=""
        t={translations.en}
        searchOpen={false}
        setSearchOpen={noop}
        highlightRange={highlightRange}
      />,
    );

  it('marks the text that was picked', () => {
    renderEditor({ start: 2, end: 5 });
    const mark = document.querySelector('[data-preview-mark]');
    expect(mark).toBeTruthy();
    expect(mark.textContent).toBe('Ana');
  });

  it('marks the focus point, so the editor can scroll to the word under the pointer', () => {
    renderEditor({ start: 2, end: 11, focus: 6 });
    const focus = document.querySelector('[data-preview-focus]');
    expect(focus).toBeTruthy();
    expect(focus.textContent).toBe('Gomez');
  });

  it('marks nothing when there is no range', () => {
    renderEditor(null);
    expect(document.querySelector('[data-preview-mark]')).toBeNull();
  });

  it('scrolls the editor to the text that was picked', async () => {
    const { container } = renderEditor({ start: 10, end: 14 });
    const textarea = container.querySelector('textarea');
    Object.defineProperty(textarea, 'scrollHeight', { value: 1000, configurable: true });
    Object.defineProperty(textarea, 'clientHeight', { value: 200, configurable: true });

    await new Promise((resolve) => requestAnimationFrame(resolve));

    expect(textarea.scrollTop).toBeGreaterThanOrEqual(0);
  });

  it('keeps the highlight layer where the editor is, so the mark is never on another line', () => {
    const { container, rerender } = renderEditor({ start: 2, end: 5, focus: 2 });
    const textarea = container.querySelector('textarea');
    const backdrop = container.querySelector('[data-testid="editor-search-backdrop"]');
    expect(backdrop).toBeTruthy();

    textarea.scrollTop = 250;
    rerender(
      <MarkdownEditor
        markdown={MD}
        setMarkdown={noop}
        sampleCVs={[]}
        lang="en"
        onSelectSample={noop}
        wordCount={10}
        savedDrafts={[]}
        onSaveDraft={noop}
        currentDraftName=""
        t={translations.en}
        searchOpen={false}
        setSearchOpen={noop}
        highlightRange={{ start: 2, end: 5, focus: 4 }}
      />,
    );

    expect(backdrop.scrollTop).toBe(250);
  });
});
