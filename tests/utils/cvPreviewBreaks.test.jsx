import { describe, it, expect, afterEach } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import CVPreview from '../../src/components/CVPreview';
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
const noop = () => {};

describe('br', () => {
  afterEach(() => cleanup());

  const renderBr = (markdown) =>
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
      />,
    );

  it('draws the breaks around a block', () => {
    const { container } = renderBr('<br>\n\nasd\n\n<br>\n');
    const page = container.querySelector('.cv-pages .cv-page .cv-paper');
    expect(page?.querySelectorAll('br').length).toBe(2);
    expect(page?.textContent).toBe('asd');
  });

  it('keeps the break with the block that follows it', () => {
    const { container } = renderBr('uno\n\n<br>\n\ndos');
    const page = container.querySelector('.cv-pages .cv-page .cv-paper');
    expect(page?.querySelectorAll('br').length).toBe(1);
  });

  it('still shows nothing but an empty page when the CV is only breaks', () => {
    const { container } = renderBr('<br>\n\n<br>');
    expect(container.querySelectorAll('.cv-pages .cv-page').length).toBe(1);
  });
});
