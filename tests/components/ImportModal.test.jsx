import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, screen, cleanup, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import ImportModal from '../../src/components/ImportModal';
import { translations } from '../../src/data/translations';

const t = translations.en;

const CV_TEXT = `Ana Gomez
Frontend Engineer
ana@mail.com | linkedin.com/in/ana

EXPERIENCIA
Acme Corp | 2020 - 2024
- Led the migration that cut deploys by 45%

HABILIDADES
React, TypeScript, CSS
`;

const renderModal = (props = {}) => {
  const onImport = vi.fn();
  const onClose = vi.fn();
  render(<ImportModal open onClose={onClose} onImport={onImport} t={t} lang="en" {...props} />);
  return { onImport, onClose };
};


const paste = async (text) => {
  fireEvent.change(screen.getByPlaceholderText(/paste here/i), { target: { value: text } });
  fireEvent.click(screen.getByRole('button', { name: /convert the text/i }));
  await waitFor(() => expect(screen.getByText(/# Ana Gomez/)).toBeTruthy());
};

describe('ImportModal', () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('renders nothing while it is closed', () => {
    const { container } = render(
      <ImportModal open={false} onClose={vi.fn()} onImport={vi.fn()} t={t} lang="en" />,
    );
    expect(container.firstChild).toBe(null);
  });

  it('shows what it found and only writes on confirm', async () => {
    const { onImport, onClose } = renderModal();
    await paste(CV_TEXT);


    expect(screen.getByText('Ana Gomez')).toBeTruthy();
    expect(screen.getByText('ana@mail.com')).toBeTruthy();
    expect(screen.getByText(/EXPERIENCIA/)).toBeTruthy();
    expect(screen.getByText(/HABILIDADES/)).toBeTruthy();
    expect(onImport).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: /^import$/i }));
    expect(onImport).toHaveBeenCalledTimes(1);
    const imported = onImport.mock.calls[0][0];
    expect(imported).toContain('# Ana Gomez');

    expect(imported).toContain('## EXPERIENCE');
    expect(imported).toContain('## SKILLS');
    expect(imported).toContain('- Led the migration that cut deploys by 45%');
    expect(onClose).toHaveBeenCalled();
  });

  it('keeps the confirm button closed until there is something to import', () => {
    renderModal();
    expect(screen.getByRole('button', { name: /^import$/i }).disabled).toBe(true);
  });

  it('warns that the import replaces unsaved work', async () => {
    renderModal({ isUnsaved: true });
    await paste(CV_TEXT);
    expect(screen.getByText(/replace what is in the editor/i)).toBeTruthy();
  });

  it('says when the text has no section headings instead of pretending', async () => {
    renderModal();
    fireEvent.change(screen.getByPlaceholderText(/paste here/i), {
      target: { value: 'Ana Gomez\nana@mail.com' },
    });
    fireEvent.click(screen.getByRole('button', { name: /convert the text/i }));
    expect(screen.getByText(/no section heading was recognised/i)).toBeTruthy();
  });

  it('refuses a file it cannot read, in the language of the interface', async () => {
    renderModal();
    const input = document.querySelector('input[type="file"]');
    const file = new File(['x'], 'cv.exe', { type: 'application/octet-stream' });
    fireEvent.change(input, { target: { files: [file] } });

    await waitFor(() => expect(screen.getByText(/not supported/i)).toBeTruthy());
  });

  it('writes the letter in Spanish when the interface is in Spanish', async () => {
    renderModal({ lang: 'es', t: translations.es });
    fireEvent.change(screen.getByPlaceholderText(/pega aquí/i), {
      target: { value: 'Ana Gómez\nana@mail.com\n\nEXPERIENCIA\nAcme\n- Lideré la migración' },
    });
    fireEvent.click(screen.getByRole('button', { name: /convertir el texto/i }));
    await waitFor(() => expect(screen.getByText(/# Ana Gómez/)).toBeTruthy());
  });
});
