import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, screen, cleanup, fireEvent, waitFor, act } from '@testing-library/react';
import CoverLetterModal from '../../src/components/CoverLetterModal';
import { translations } from '../../src/data/translations';

const t = translations.en;

const CV = `# Ana Gomez

ana@mail.com | linkedin.com/in/ana

## EXPERIENCIA

### Acme Corp | 2020 - 2024

- Led the migration that cut deploys by 45% and saved $120k a year
- Rebuilt the billing service, dropping incidents by 30%
`;

const styles = {
  fontFamily: 'Inter, sans-serif',
  fontSize: 13,
  lineHeight: 1.48,
  marginX: 28,
  marginY: 24,
  sectionGap: 16,
  itemGap: 10,
  primaryColor: '#1e293b',
  textColor: '#1e293b',
  subtextColor: '#475569',
  borderStyle: 'line',
  bulletStyle: '•',
};

const renderModal = (props = {}) => {
  
  const onRequestExport = vi.fn((work) => work());
  const onClose = vi.fn();
  render(
    <CoverLetterModal
      open
      onClose={onClose}
      onRequestExport={onRequestExport}
      markdown={CV}
      styles={styles}
      t={t}
      lang="en"
      {...props}
    />,
  );
  return { onRequestExport, onClose };
};

const letterBox = () =>
  screen.getByRole('textbox', { name: /cover letter|carta de presentación/i });

const fillAndWrite = (role, company, writeLabel = /write the letter/i) => {
  if (role) {
    fireEvent.change(screen.getByPlaceholderText('Frontend Engineer'), { target: { value: role } });
  }
  if (company) {
    fireEvent.change(screen.getByPlaceholderText('Globex'), { target: { value: company } });
  }
  fireEvent.click(screen.getByRole('button', { name: writeLabel }));
  return letterBox();
};

describe('CoverLetterModal', () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('renders nothing while it is closed', () => {
    const { container } = render(
      <CoverLetterModal
        open={false}
        onClose={vi.fn()}
        onRequestExport={vi.fn()}
        markdown={CV}
        styles={styles}
        t={t}
        lang="en"
      />,
    );
    expect(container.firstChild).toBe(null);
  });

  it('writes the letter with the data of the CV, not with invented data', () => {
    renderModal();
    const letter = fillAndWrite('Frontend Engineer', 'Globex');

    expect(letter.value).toContain('# Ana Gomez');
    expect(letter.value).toContain('ana@mail.com');
    expect(letter.value).toContain('**Application: Frontend Engineer at Globex**');
    expect(letter.value).toContain('Dear Globex team,');

    expect(letter.value).toContain('Led the migration that cut deploys by 45%');
    expect(letter.value).toContain('dropping incidents by 30%');
  });

  it('points at the placeholders while the role and the company are missing', () => {
    renderModal();
    const letter = fillAndWrite('', '');

    expect(letter.value).toContain('[the role]');
    expect(screen.getByText(/placeholder\(s\) left/i)).toBeTruthy();
  });

  it('writes in Spanish when the interface is in Spanish', () => {
    renderModal({ t: translations.es, lang: 'es' });
    const letter = fillAndWrite('Frontend Engineer', 'Globex', /redactar la carta/i);
    expect(letter.value).toContain('Estimado equipo de Globex,');
    expect(letter.value).toContain('Un cordial saludo,');
  });

  it('keeps the user edits and can give them back', () => {
    renderModal();
    const letter = fillAndWrite('Frontend Engineer', 'Globex');
    const generated = letter.value;

    fireEvent.change(letter, { target: { value: `${generated}\n\nPD: hablo inglés.` } });
    expect(letter.value).toContain('PD: hablo inglés');

    fireEvent.click(screen.getByRole('button', { name: /undo my edits/i }));
    expect(letterBox().value).toBe(generated);
  });

  it('asks the export guard before it prints anything', () => {
    const { onRequestExport } = renderModal();
    fillAndWrite('Frontend Engineer', 'Globex');
    const open = vi.fn();
    vi.stubGlobal('open', open);

    fireEvent.click(screen.getByRole('button', { name: /^print$/i }));

    expect(onRequestExport).toHaveBeenCalledTimes(1);

    const [work] = onRequestExport.mock.calls[0];
    expect(typeof work).toBe('function');
    act(() => {
      work();
    });
    expect(open).toHaveBeenCalled();
    vi.unstubAllGlobals();
  });

  it('does not print while the guard holds the export back', () => {
    const onRequestExport = vi.fn();
    const open = vi.fn();
    vi.stubGlobal('open', open);
    renderModal({ onRequestExport });

    fillAndWrite('Frontend Engineer', 'Globex');
    fireEvent.click(screen.getByRole('button', { name: /^print$/i }));

    expect(onRequestExport).toHaveBeenCalledTimes(1);
    expect(open).not.toHaveBeenCalled();
    vi.unstubAllGlobals();
  });

  it('copies the letter as plain text, without Markdown', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
    renderModal();
    fillAndWrite('Frontend Engineer', 'Globex');

    fireEvent.click(screen.getByRole('button', { name: /copy as text/i }));

    await waitFor(() => expect(writeText).toHaveBeenCalled());
    const copied = writeText.mock.calls[0][0];
    expect(copied).toContain('Ana Gomez');
    expect(copied).not.toMatch(/[*#]/);
  });

  it('says so when the clipboard refuses the letter', async () => {
    const writeText = vi.fn().mockRejectedValue(new Error('denied'));
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
    renderModal();
    fillAndWrite('Frontend Engineer', 'Globex');

    fireEvent.click(screen.getByRole('button', { name: /copy as text/i }));

    await waitFor(() => expect(screen.getByText(t.letterCopyFailed)).toBeTruthy());
  });

  it('downloads the letter as a PDF through the export guard', () => {
    global.URL.createObjectURL = vi.fn(() => 'blob:cover-letter');
    global.URL.revokeObjectURL = vi.fn();
    const { onRequestExport } = renderModal();
    fillAndWrite('Frontend Engineer', 'Globex');

    fireEvent.click(screen.getByRole('button', { name: /download pdf/i }));

    expect(onRequestExport).toHaveBeenCalledTimes(1);
    expect(global.URL.createObjectURL).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'application/pdf' }),
    );
    expect(screen.getByText(t.letterPdfDone)).toBeTruthy();
  });
});
