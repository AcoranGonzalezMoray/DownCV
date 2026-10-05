import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, cleanup, fireEvent, act } from '@testing-library/react';
import App from '../src/App';

beforeEach(() => {
  window.localStorage.clear();
  
  vi.stubGlobal(
    'matchMedia',
    vi.fn(() => ({ matches: false, addEventListener() {}, removeEventListener() {} })),
  );
  document.fonts = { ready: Promise.resolve(), addEventListener() {}, removeEventListener() {} };
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

const tab = (name) => screen.getByTitle(new RegExp(name, 'i'));

const editor = () => screen.getByRole('textbox', { name: 'Markdown Editor' });
const search = () => screen.getByRole('textbox', { name: 'Search for a command' });

describe('App', () => {
  it('mounts with the editor, the preview and the styles panel on screen', async () => {
    render(<App />);
    await act(async () => {});
    expect(editor()).toBeTruthy();
    expect(document.querySelector('.cv-page')).toBeTruthy();
    expect(tab('Styles')).toBeTruthy();
  });

  it('opens every panel of the sidebar without breaking', () => {
    render(<App />);
    for (const name of ['ATS Score', 'Versions', 'Styles']) {
      fireEvent.click(tab(name));
      expect(editor()).toBeTruthy();
    }

    fireEvent.click(tab('Versions'));
    expect(screen.getByText('CV versions')).toBeTruthy();
    fireEvent.click(tab('Styles'));
    expect(screen.getByText('ATS Layout Presets')).toBeTruthy();
  });

  it('offers the seniority calibration with the offer and nowhere else', () => {
    render(<App />);
    fireEvent.click(tab('ATS Score'));
    
    expect(screen.queryByText('Target seniority')).toBe(null);

    fireEvent.click(screen.getByRole('button', { name: /Job Matcher/ }));
    expect(screen.getByText('Target seniority')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: /ATS Analyzer/ }));
    expect(screen.queryByText('Target seniority')).toBe(null);
  });

  it('opens the command palette with the keyboard and runs a command from it', () => {
    render(<App />);
    expect(screen.queryByRole('dialog', { name: 'Commands' })).toBe(null);

    fireEvent.keyDown(window, { key: 'k', ctrlKey: true });
    expect(screen.getByRole('dialog', { name: 'Commands' })).toBeTruthy();

    fireEvent.change(search(), { target: { value: 'versions panel' } });
    fireEvent.keyDown(search(), { key: 'Enter' });

    expect(screen.getByText('CV versions')).toBeTruthy();
    expect(screen.queryByRole('dialog', { name: 'Commands' })).toBe(null);
  });

  it('opens the command palette from the button in the bar, too', () => {
    render(<App />);
    fireEvent.click(screen.getByTitle(/Commands \(Ctrl\+K\)/));
    expect(screen.getByRole('dialog', { name: 'Commands' })).toBeTruthy();
  });

  it('switches a template from the palette and the layout follows it', () => {
    render(<App />);
    fireEvent.keyDown(window, { key: 'k', ctrlKey: true });
    fireEvent.change(search(), { target: { value: 'elegant-serif' } });
    fireEvent.keyDown(search(), { key: 'Enter' });

    const sheet = document.querySelector('.cv-page .cv-paper');
    expect(sheet.className).toMatch(/border-style-double/);
    expect(sheet.style.getPropertyValue('--cv-paper-primary')).toBe('#881337');
  });

  it('switches a template from the styles panel to the same result', () => {
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: /Serif Premium/ }));
    const sheet = document.querySelector('.cv-page .cv-paper');
    expect(sheet.className).toMatch(/border-style-double/);
    expect(sheet.style.getPropertyValue('--cv-paper-primary')).toBe('#881337');
  });

  it('switches the view without losing the document', () => {
    render(<App />);
    const before = editor().value;

    fireEvent.click(screen.getByTitle('Editor'));
    expect(editor()).toBeTruthy();
    expect(document.querySelector('.cv-page')).toBe(null);

    fireEvent.click(screen.getByTitle('Split View'));
    expect(editor().value).toBe(before);
    expect(document.querySelector('.cv-page')).toBeTruthy();
  });

  it('saves a version of the CV from the panel and it survives a reload', () => {
    render(<App />);
    fireEvent.click(tab('Versions'));
    fireEvent.change(screen.getByPlaceholderText('Acme · Frontend Engineer'), {
      target: { value: 'Acme · Fullstack' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Save this CV as a new version/ }));

    expect(screen.getByText('Acme · Fullstack')).toBeTruthy();
    
    const stored = JSON.parse(window.localStorage.getItem('downcv_cv_variants'));
    expect(stored).toHaveLength(1);
    expect(stored[0].markdown).toBe(editor().value);
  });

  it('writes the CV to the file it is linked to when it is saved', async () => {
    const write = vi.fn(async () => {});
    const close = vi.fn(async () => {});
    window.FileSystemFileHandle = function FileSystemFileHandle() {};
    window.showOpenFilePicker = vi.fn(async () => [
      {
        name: 'cv.md',
        getFile: vi.fn(async () => ({ text: async () => '# Ana from disk' })),
        createWritable: vi.fn(async () => ({ write, close })),
      },
    ]);

    render(<App />);
    fireEvent.click(tab('Versions'));
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Link a \.md file/ }));
    });

    expect(editor().value).toBe('# Ana from disk');
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Write to the file/ }));
    });
    expect(write).toHaveBeenCalledWith('# Ana from disk');
  });

  it('switches language and takes the whole interface with it', () => {
    render(<App />);
    fireEvent.click(screen.getByTitle('Interfaz y plantillas en español'));
    expect(tab('Estilos')).toBeTruthy();

    fireEvent.click(tab('Versiones'));
    expect(screen.getByText('Versiones del CV')).toBeTruthy();
    expect(screen.getByPlaceholderText('Acme · Frontend Engineer')).toBeTruthy();
  });

  it('enables the AI rewrite button from the AI settings, and it survives a reload', () => {
    render(<App />);
    expect(screen.queryByRole('button', { name: /improve with ai/i })).toBe(null);

    fireEvent.click(screen.getByTitle(/AI Assistant/));
    const toggle = screen.getByRole('switch', { name: /enable ai in the preview/i });
    expect(toggle.getAttribute('aria-checked')).toBe('false');
    fireEvent.click(toggle);
    fireEvent.click(screen.getByRole('button', { name: /^done$/i }));

    expect(screen.getByRole('button', { name: /improve with ai/i })).toBeTruthy();

    cleanup();
    render(<App />);
    fireEvent.click(screen.getByTitle(/AI Assistant/));
    expect(
      screen.getByRole('switch', { name: /enable ai in the preview/i }).getAttribute('aria-checked'),
    ).toBe('true');
  });

  it('marks the preview line the editor cursor stands on', async () => {
    render(<App />);
    const box = editor();
    expect(document.querySelector('.cv-cursor-line')).toBe(null);

    const at = Math.floor(box.value.length / 2);
    box.setSelectionRange(at, at);
    await act(async () => {
      fireEvent.click(box);
      await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    });

    const marked = document.querySelector('.cv-page .cv-cursor-line');
    expect(marked).toBeTruthy();
    expect(marked.textContent.length).toBeGreaterThan(0);
  });

  it('clears the preview mark when the editor loses focus', async () => {
    render(<App />);
    const box = editor();
    box.setSelectionRange(10, 10);
    await act(async () => {
      fireEvent.click(box);
      await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    });
    expect(document.querySelector('.cv-cursor-line')).toBeTruthy();

    fireEvent.blur(box);
    expect(document.querySelector('.cv-cursor-line')).toBe(null);
  });

  it('keeps the view switch in the flow until measured, so it never lands on the tabs', async () => {
    render(<App />);
    await act(async () => {});
    const switchBox = screen.getByTitle(/split view/i).closest('div.grid');
    expect(switchBox.className).toMatch(/topbar-switch/);
    expect(switchBox.className).not.toMatch(/topbar-switch-centered/);
    const header = document.querySelector('header');
    expect(header.className).toMatch(/flex-wrap/);
  });

  it('walks a first-time visitor through the app, then never again', () => {
    render(<App />);
    expect(screen.getByRole('dialog', { name: /welcome to downcv/i })).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: /skip tour/i }));
    expect(screen.queryByRole('dialog', { name: /welcome to downcv/i })).toBe(null);

    cleanup();
    render(<App />);
    expect(screen.queryByRole('dialog', { name: /welcome to downcv/i })).toBe(null);
  });

  it('replays the tour from the command palette', () => {
    window.localStorage.setItem('downcv_tour_done', 'true');
    render(<App />);
    expect(screen.queryByRole('dialog', { name: /welcome to downcv/i })).toBe(null);

    fireEvent.keyDown(window, { key: 'k', ctrlKey: true });
    fireEvent.change(search(), { target: { value: 'tour' } });
    fireEvent.keyDown(search(), { key: 'Enter' });

    expect(screen.getByRole('dialog', { name: /welcome to downcv/i })).toBeTruthy();
  });
});
