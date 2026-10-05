import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, cleanup, act, fireEvent, waitFor } from '@testing-library/react';
import CVPreview from '../../src/components/CVPreview';
import { callAIEndpoint } from '../../src/utils/aiEnhancer';
import { translations } from '../../src/data/translations';

vi.mock('../../src/utils/aiEnhancer', async (importOriginal) => {
  const actual = await importOriginal();
  return { ...actual, callAIEndpoint: vi.fn() };
});

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

const MD = '# Ana Gomez\n\n[linkedin.com/in/ana](https://linkedin.com) and [my site](https://ana.dev)';

const noop = () => {};
const aiSettings = { endpoint: 'http://localhost:11434/v1/chat/completions', model: 'llama3', apiKey: '' };

const renderPreview = ({ aiEnabled = true, ...extra } = {}) => {
  const setMarkdown = vi.fn();
  render(
    <CVPreview
      markdown={MD}
      setMarkdown={setMarkdown}
      styles={styles}
      t={translations.en}
      undo={noop}
      redo={noop}
      canUndo={false}
      canRedo={false}
      lang="en"
      aiEnabled={aiEnabled}
      aiSettings={aiSettings}
      {...extra}
    />,
  );
  return setMarkdown;
};

const selectParagraph = async () => {
  const paragraph = document.querySelector('.cv-page .cv-paper p');
  const range = document.createRange();
  range.selectNodeContents(paragraph);
  const selection = window.getSelection();
  selection.removeAllRanges();
  selection.addRange(range);
  await act(async () => {
    document.dispatchEvent(new Event('selectionchange'));
    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  });
};

describe('CVPreview AI rewrite', () => {
  beforeEach(() => {
    window.localStorage.clear();
    vi.mocked(callAIEndpoint).mockReset();
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('hides the AI button while the AI is off, even with selected text', async () => {
    renderPreview({ aiEnabled: false });
    await selectParagraph();
    expect(screen.queryByRole('button', { name: /improve with ai/i })).toBe(null);
  });

  it('disables the AI button while nothing is selected', () => {
    renderPreview();
    expect(screen.getByRole('button', { name: /improve with ai/i }).disabled).toBe(true);
  });

  it('opens the rewrite options next to the selected text', async () => {
    renderPreview();
    await selectParagraph();
    expect(screen.getByRole('button', { name: /improve with ai/i }).disabled).toBe(false);

    fireEvent.click(screen.getByRole('button', { name: /improve with ai/i }));
    expect(screen.getByRole('dialog', { name: /same meaning/i })).toBeTruthy();
    expect(
      screen.getAllByText(/linkedin\.com\/in\/ana and my site/),
    ).toHaveLength(2);
  });

  it('parks the panel in a fixed corner when nothing measures', async () => {
    renderPreview();
    await selectParagraph();
    fireEvent.click(screen.getByRole('button', { name: /improve with ai/i }));
    const dialog = screen.getByRole('dialog', { name: /same meaning/i });
    expect(dialog.style.top).toBe('88px');
    expect(dialog.style.left).toBe('16px');
  });

  it('replaces the selection with the picked wording', async () => {
    const setMarkdown = renderPreview();
    await selectParagraph();
    fireEvent.click(screen.getByRole('button', { name: /improve with ai/i }));

    const option = screen.getByText(/resulting in a 30% reduction/);
    fireEvent.click(option);

    expect(setMarkdown).toHaveBeenCalledTimes(1);
    expect(setMarkdown.mock.calls[0][0]).toContain('resulting in a 30% reduction');
    expect(screen.queryByRole('dialog', { name: /same meaning/i })).toBe(null);
  });

  it('adds the local model answer as one more option', async () => {
    vi.mocked(callAIEndpoint).mockResolvedValue('Ollama says hi.');
    renderPreview();
    await selectParagraph();
    fireEvent.click(screen.getByRole('button', { name: /improve with ai/i }));

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /generate with ollama/i }));
    });
    await waitFor(() => expect(screen.getByText('Ollama says hi.')).toBeTruthy());
    expect(callAIEndpoint).toHaveBeenCalledWith(
      expect.objectContaining({ model: 'llama3', apiKey: '' }),
    );
  });

  it('says when the local model does not answer', async () => {
    vi.mocked(callAIEndpoint).mockRejectedValue(new Error('fetch failed'));
    renderPreview();
    await selectParagraph();
    fireEvent.click(screen.getByRole('button', { name: /improve with ai/i }));

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /generate with ollama/i }));
    });
    await waitFor(() => expect(screen.getByText(/did not answer/)).toBeTruthy());
  });
});
