import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, screen, cleanup, fireEvent, act, within } from '@testing-library/react';
import { useState } from 'react';
import MarkdownEditor from '../../src/components/MarkdownEditor';
import { translations } from '../../src/data/translations';
import { samplesFor } from '../../src/data/sampleCVs';
import { listSections } from '../../src/utils/markdownSections';

const CV = `# Ana Gomez

ana@mail.com | +34 600 000 000

## WORK EXPERIENCE

### **Acme** | Madrid
**Engineer** | *2020 – Present*
- Kept the billing service under a minute.
`;

const CV_ES = `# Ana Gómez

ana@mail.com | +34 600 000 000

## EXPERIENCIA LABORAL

### **Acme** | Madrid
**Ingeniera** | *2020 – Actualidad*
- Mantuvo el servicio de facturación por debajo del minuto.
`;

const renderEditor = (lang, markdown = CV) => {
  let current = markdown;
  const setMarkdown = vi.fn((next) => {
    current = next;
  });
  const view = render(
    <MarkdownEditor
      markdown={current}
      setMarkdown={setMarkdown}
      sampleCVs={samplesFor(lang)}
      lang={lang}
      onSelectSample={vi.fn()}
      wordCount={42}
      savedDrafts={[]}
      onSaveDraft={vi.fn()}
      currentDraftName=""
      t={translations[lang]}
      searchOpen={false}
      setSearchOpen={vi.fn()}
    />,
  );
  return { setMarkdown, view };
};

const click = (name) => fireEvent.click(screen.getByRole('button', { name }));

describe('MarkdownEditor insert buttons', () => {
  afterEach(() => cleanup());

  it('names the buttons in the language of the interface', () => {
    renderEditor('es');
    for (const label of ['Perfil', 'Resumen', 'Experiencia', 'Educación', 'Habilidades', 'Certificación']) {
      expect(screen.getByRole('button', { name: new RegExp(`${label}$`) })).toBeTruthy();
    }
  });

  it('offers the profile and the summary in English too', () => {
    renderEditor('en');
    for (const label of ['Profile', 'Summary']) {
      expect(screen.getByRole('button', { name: new RegExp(`${label}$`) })).toBeTruthy();
    }
  });

  it('writes the profile at the top of the CV', () => {
    const { setMarkdown } = renderEditor('en', '# Ana Gomez\n\n## WORK EXPERIENCE\n\n- Did things\n');
    click('Profile');
    const next = setMarkdown.mock.calls.at(-1)[0];
    expect(next.startsWith('# Ana Gomez')).toBe(true);
    expect(next).toContain('**[Your Professional Title]**');
    expect(next).toContain('[xxxx.xxxx@example.com](mailto:xxxx.xxxx@example.com)');
  });

  it('writes the summary before the other sections', () => {
    const { setMarkdown } = renderEditor('en', '# Ana Gomez\n\n## WORK EXPERIENCE\n\n- Did things\n');
    click('Summary');
    const next = setMarkdown.mock.calls.at(-1)[0];
    expect(next.indexOf('## PROFESSIONAL SUMMARY')).toBeLessThan(
      next.indexOf('## WORK EXPERIENCE'),
    );
  });

  it('adds the section in that language', () => {
    const { setMarkdown } = renderEditor('es', CV_ES);
    click('Experiencia');
    const next = setMarkdown.mock.calls.at(-1)[0];
    expect(listSections(next).map((section) => section.title)).toContain('EXPERIENCIA LABORAL');
    expect(next).toContain('Nombre de la empresa');

    expect(next).toContain('- Mantuvo el servicio de facturación por debajo del minuto.');
    expect(listSections(next)).toHaveLength(1);
  });

  it('adds the section the document is missing, without touching the others', () => {
    const { setMarkdown } = renderEditor('es', CV_ES);
    click('Habilidades');
    const next = setMarkdown.mock.calls.at(-1)[0];
    expect(listSections(next).map((section) => section.title)).toEqual([
      'EXPERIENCIA LABORAL',
      'HABILIDADES TÉCNICAS',
    ]);
  });

  it('adds the English section when the interface is in English', () => {
    const { setMarkdown } = renderEditor('en');
    click('Education');
    const next = setMarkdown.mock.calls.at(-1)[0];
    expect(listSections(next).map((section) => section.title)).toContain('EDUCATION');
    expect(next).toContain('Degree or Academic Title');
  });

  it('never writes the same heading twice', () => {
    const { setMarkdown } = renderEditor('en');
    click('Experience');
    const first = setMarkdown.mock.calls.at(-1)[0];
    expect(first.match(/## WORK EXPERIENCE/g)).toHaveLength(1);
  });

  it('offers every insertable block', () => {
    const { setMarkdown } = renderEditor('es', CV_ES);
    for (const [label, title] of [
      ['Habilidades', 'HABILIDADES TÉCNICAS'],
      ['Certificación', 'CERTIFICACIONES'],
    ]) {
      click(label);
      expect(
        listSections(setMarkdown.mock.calls.at(-1)[0]).map((section) => section.title),
      ).toContain(title);
    }
  });

  it('appends at the end when the editor is not focused, never above the name', () => {
    const { setMarkdown } = renderEditor('es', CV_ES);
    click('Educación');
    const next = setMarkdown.mock.calls.at(-1)[0];

    expect(next.startsWith('# Ana Gómez')).toBe(true);
    expect(listSections(next).map((section) => section.title)).toEqual([
      'EXPERIENCIA LABORAL',
      'EDUCACIÓN',
    ]);
  });

  it('puts the section where the caret is when the editor is focused', () => {
    const { setMarkdown } = renderEditor('es', CV_ES);
    const textarea = screen.getByRole('textbox');
    const at = CV_ES.indexOf('## EXPERIENCIA');
    textarea.focus();
    textarea.setSelectionRange(at, at);
    click('Habilidades');
    const next = setMarkdown.mock.calls.at(-1)[0];
    expect(listSections(next).map((section) => section.title)).toEqual([
      'HABILIDADES TÉCNICAS',
      'EXPERIENCIA LABORAL',
    ]);
  });

  it('keeps the caret when the button takes the focus away from the editor', () => {
    const { setMarkdown } = renderEditor('es', CV_ES);
    const textarea = screen.getByRole('textbox');
    const at = CV_ES.indexOf('## EXPERIENCIA');
    textarea.focus();
    textarea.setSelectionRange(at, at);
    fireEvent.blur(textarea);
    screen.getByRole('button', { name: /Habilidades/ }).focus();
    click('Habilidades');
    const next = setMarkdown.mock.calls.at(-1)[0];
    expect(listSections(next).map((section) => section.title)).toEqual([
      'HABILIDADES TÉCNICAS',
      'EXPERIENCIA LABORAL',
    ]);
  });

  it('sends the section to the end of the section being written when the caret is mid line', () => {
    const twoSections = `# Ana Gómez

## EXPERIENCIA LABORAL

- Mantuvo el servicio de facturación por debajo del minuto.

## EDUCACIÓN

- UPM
`;
    const { setMarkdown } = renderEditor('es', twoSections);
    const textarea = screen.getByRole('textbox');
    const at = twoSections.indexOf('Mantuvo el servicio');
    textarea.focus();
    textarea.setSelectionRange(at, at);
    fireEvent.blur(textarea);
    screen.getByRole('button', { name: /Habilidades/ }).focus();
    click('Habilidades');
    const next = setMarkdown.mock.calls.at(-1)[0];
    expect(listSections(next).map((section) => section.title)).toEqual([
      'EXPERIENCIA LABORAL',
      'HABILIDADES TÉCNICAS',
      'EDUCACIÓN',
    ]);
  });
});

describe('MarkdownEditor when a section is added', () => {
  afterEach(() => cleanup());

  it('leaves the view where the reader was, instead of jumping to the block', async () => {
    render(<StatefulEditor initial={SKILLS_CV} />);
    const textarea = screen.getByRole('textbox');
    Object.defineProperty(textarea, 'scrollHeight', { value: 1000, configurable: true });
    Object.defineProperty(textarea, 'clientHeight', { value: 200, configurable: true });
    textarea.scrollTop = 400;

    const setSelectionRange = textarea.setSelectionRange.bind(textarea);
    textarea.setSelectionRange = (start, end) => {
      setSelectionRange(start, end);
      textarea.scrollTop = 999;
    };

    fireEvent.click(screen.getByRole('button', { name: /Education/ }));
    await act(async () => {});

    expect(textarea.scrollTop).toBe(400);
  });

  it('says that the section was added', async () => {
    render(<StatefulEditor initial={SKILLS_CV} />);

    fireEvent.click(screen.getByRole('button', { name: /Education/ }));
    await act(async () => {});

    const notice = screen.getByTestId('snippet-notice');
    expect(notice.textContent).toContain(translations.en.snippetAdded);
    expect(notice.textContent).toContain('EDUCATION');
  });

  it('says that the block went into the section that was already there', async () => {
    render(<StatefulEditor initial={SKILLS_CV} />);

    fireEvent.click(screen.getByRole('button', { name: /Skills/ }));
    await act(async () => {});

    const notice = screen.getByTestId('snippet-notice');
    expect(notice.textContent).toContain(translations.en.snippetMerged);
    expect(notice.textContent).toContain('SKILLS');
  });

  it('offers to take the reader to the block that was added', async () => {
    render(<StatefulEditor initial={SKILLS_CV} />);
    const textarea = screen.getByRole('textbox');
    Object.defineProperty(textarea, 'scrollHeight', { value: 1000, configurable: true });
    Object.defineProperty(textarea, 'clientHeight', { value: 200, configurable: true });

    fireEvent.click(screen.getByRole('button', { name: /Education/ }));
    await act(async () => {});

    fireEvent.click(screen.getByRole('button', { name: translations.en.snippetGoTo }));
    expect(textarea.scrollTop).toBeGreaterThan(0);
    expect(screen.queryByTestId('snippet-notice')).toBeNull();
  });
});

const SKILLS_CV = '# Ana\n\n## SKILLS\n\nReact, \n\n## EXPERIENCE\n\n- Led things\n';

describe('MarkdownEditor library dropdown', () => {
  const onSelectSample = vi.fn();
  const savedDrafts = [{ id: 'd1', name: 'Mi CV' }];

  const renderLibrary = () =>
    render(
      <MarkdownEditor
        markdown={CV}
        setMarkdown={vi.fn()}
        sampleCVs={samplesFor('en')}
        lang="en"
        onSelectSample={onSelectSample}
        wordCount={42}
        savedDrafts={savedDrafts}
        onSaveDraft={vi.fn()}
        currentDraftName=""
        t={translations.en}
        searchOpen={false}
        setSearchOpen={vi.fn()}
      />,
    );

  const trigger = () =>
    screen.getByRole('button', { name: new RegExp(translations.en.openDraftOrSample) });

  afterEach(() => {
    cleanup();
    onSelectSample.mockClear();
  });

  it('stays closed until it is asked for', () => {
    renderLibrary();
    expect(screen.queryByRole('menu')).toBe(null);
    expect(trigger().getAttribute('aria-expanded')).toBe('false');
  });

  it('opens inside the screen, even on a narrow phone', () => {
    const width = window.innerWidth;
    Object.defineProperty(window, 'innerWidth', { value: 360, configurable: true });
    try {
      renderLibrary();
      fireEvent.click(trigger());

      const menu = screen.getByRole('menu');
      const left = parseFloat(menu.style.left);
      const menuWidth = parseFloat(menu.style.width);
      expect(left).toBeGreaterThanOrEqual(12);
      expect(left + menuWidth).toBeLessThanOrEqual(360 - 12);
    } finally {
      Object.defineProperty(window, 'innerWidth', { value: width, configurable: true });
    }
  });

  it('lists the drafts and the samples in groups, with an icon each', () => {
    renderLibrary();
    fireEvent.click(trigger());

    const menu = screen.getByRole('menu');
    expect(within(menu).getByText(translations.en.savedDraftsGroup)).toBeTruthy();
    expect(within(menu).getByText(translations.en.sampleTemplatesGroup)).toBeTruthy();
    expect(within(menu).getByText('Mi CV')).toBeTruthy();
    samplesFor('en').forEach((sample) => {
      expect(within(menu).getByText(sample.name)).toBeTruthy();
    });
    expect(menu.querySelectorAll('svg').length).toBeGreaterThan(0);
  });

  it('opens the CV that was pressed and closes', () => {
    renderLibrary();
    fireEvent.click(trigger());
    const sample = samplesFor('en')[0];
    fireEvent.click(screen.getByRole('menuitem', { name: new RegExp(sample.name) }));

    expect(onSelectSample).toHaveBeenCalledWith(`sample:${sample.id}`);
    expect(screen.queryByRole('menu')).toBe(null);
  });

  it('walks the list with the arrows and closes on Escape', () => {
    renderLibrary();
    fireEvent.click(trigger());
    const items = screen.getAllByRole('menuitem');

    fireEvent.keyDown(items[0], { key: 'ArrowDown' });
    expect(document.activeElement).toBe(items[1]);
    fireEvent.keyDown(items[1], { key: 'End' });
    expect(document.activeElement).toBe(items[items.length - 1]);

    fireEvent.keyDown(document.activeElement, { key: 'Escape' });
    expect(screen.queryByRole('menu')).toBe(null);
  });

  it('closes when the pointer lands outside', () => {
    renderLibrary();
    fireEvent.click(trigger());
    fireEvent.mouseDown(document.body);
    expect(screen.queryByRole('menu')).toBe(null);
  });
});

function StatefulEditor({ initial, onScrollRatio = null, syncRequest = null }) {
  const [markdown, setMarkdown] = useState(initial);
  return (
    <MarkdownEditor
      markdown={markdown}
      setMarkdown={setMarkdown}
      sampleCVs={[]}
      lang="en"
      onSelectSample={() => {}}
      wordCount={markdown.split(/\s+/).filter(Boolean).length}
      savedDrafts={[]}
      onSaveDraft={() => {}}
      currentDraftName=""
      t={translations.en}
      searchOpen={false}
      setSearchOpen={() => {}}
      onScrollRatio={onScrollRatio}
      syncRequest={syncRequest}
    />
  );
}

const type = (text) => {
  const textarea = screen.getByRole('textbox');
  fireEvent.change(textarea, { target: { value: text, selectionStart: text.length } });

  textarea.setSelectionRange(text.length, text.length);
  fireEvent.keyDown(textarea, { key: 'x' });
};

const options = () => {
  const list = screen.queryByRole('listbox');
  return list ? within(list).queryAllByRole('option') : [];
};
const optionNames = () => options().map((option) => option.dataset.skill);

const typeInSkills = (word) => {
  const head = SKILLS_CV.slice(0, SKILLS_CV.indexOf('React, ') + 'React, '.length);
  type(head + word);
};

describe('MarkdownEditor technology autocomplete', () => {
  afterEach(() => cleanup());

  it('completes a technology while the skills section is being written', () => {
    render(<StatefulEditor initial={SKILLS_CV} />);
    typeInSkills('Kube');

    expect(optionNames()).toContain('Kubernetes');
  });

  it('writes the full name, with the separator of a list, replacing the fragment', () => {
    render(<StatefulEditor initial={SKILLS_CV} />);
    typeInSkills('Kube');

    fireEvent.mouseDown(options().find((option) => option.dataset.skill === 'Kubernetes'));

    const next = screen.getByRole('textbox').value;
    expect(next).toContain('React, Kubernetes, ');

    expect(next).not.toMatch(/Kube(?![rn])/);

    expect(options()).toHaveLength(0);
  });

  it('never suggests a technology the CV already lists', () => {
    render(<StatefulEditor initial={SKILLS_CV} />);
    typeInSkills('Rea');

    expect(optionNames()).not.toContain('React');
    expect(optionNames()).toContain('React Native');
  });

  it('stays out of the way everywhere except the skills section', () => {
    render(<StatefulEditor initial={SKILLS_CV} />);
    type(`${SKILLS_CV.slice(0, SKILLS_CV.indexOf('React'))}React\n\n## NOTES\n\nKube`);
    expect(options()).toHaveLength(0);
  });

  it('takes the highlighted suggestion with Tab and moves the highlight with the arrows', () => {
    render(<StatefulEditor initial={SKILLS_CV} />);
    typeInSkills('Post');
    const [first, second] = options();
    expect(first.dataset.skill).toBeTruthy();
    expect(second.dataset.skill).toBeTruthy();

    fireEvent.keyDown(screen.getByRole('textbox'), { key: 'ArrowDown' });
    expect(second.getAttribute('aria-selected')).toBe('true');
    expect(first.getAttribute('aria-selected')).toBe('false');

    fireEvent.keyDown(screen.getByRole('textbox'), { key: 'Tab' });
    expect(screen.getByRole('textbox').value).toContain(second.dataset.skill);
  });

  it('wraps the highlight around the list, so the last one is one key away', () => {
    render(<StatefulEditor initial={SKILLS_CV} />);
    typeInSkills('Post');
    const list = options();

    fireEvent.keyDown(screen.getByRole('textbox'), { key: 'ArrowUp' });

    const last = list[list.length - 1];
    expect(last.getAttribute('aria-selected')).toBe('true');
    fireEvent.keyDown(screen.getByRole('textbox'), { key: 'Tab' });
    expect(screen.getByRole('textbox').value).toContain(last.dataset.skill);
  });

  it('closes on Escape without touching the text that was typed', () => {
    render(<StatefulEditor initial={SKILLS_CV} />);
    const typed = `${SKILLS_CV.slice(0, SKILLS_CV.indexOf('React'))}Kube`;
    type(typed);
    expect(options().length).toBeGreaterThan(0);

    fireEvent.keyDown(screen.getByRole('textbox'), { key: 'Escape' });
    expect(options()).toHaveLength(0);
    expect(screen.getByRole('textbox').value).toBe(typed);
  });

  it('is drawn in the colours of the app, solid, and readable while typing', () => {
    const { container } = render(<StatefulEditor initial={SKILLS_CV} />);
    typeInSkills('Post');

    const panel = screen.getByRole('listbox').closest('div');

    expect(panel.className).toMatch(/bg-\[var\(--ui-bg-card\)\]/);
    expect(panel.className).not.toMatch(/\/9[05]|\/8[0-9]/);
    expect(panel.className).not.toMatch(/backdrop-blur/);

    const [first, second] = options();
    expect(first.className).toMatch(/bg-\[var\(--ui-accent\)\]/);
    expect(first.className).toMatch(/text-\[var\(--ui-text-inverse\)\]/);
    expect(second.className).not.toMatch(/bg-\[var\(--ui-accent\)\]/);

    expect(container.textContent).toMatch(/Data/);
  });
});

describe('MarkdownEditor keeps up with the preview', () => {
  afterEach(() => cleanup());

  const withScrollBox = () => {
    const textarea = screen.getByRole('textbox');
    Object.defineProperty(textarea, 'scrollHeight', { value: 1000, configurable: true });
    Object.defineProperty(textarea, 'clientHeight', { value: 200, configurable: true });
    return textarea;
  };

  it('tells the app how far through the document the reader has gone', () => {
    const onScrollRatio = vi.fn();
    render(<StatefulEditor initial={SKILLS_CV} onScrollRatio={onScrollRatio} />);
    const textarea = withScrollBox();
    textarea.scrollTop = 400;

    fireEvent.scroll(textarea);
    expect(onScrollRatio).toHaveBeenCalledWith(0.5);
  });

  it('scrolls to where the preview went, and does not answer its own move', () => {
    const onScrollRatio = vi.fn();
    const { rerender } = render(
      <StatefulEditor initial={SKILLS_CV} onScrollRatio={onScrollRatio} syncRequest={null} />,
    );
    const textarea = withScrollBox();

    act(() => {
      rerender(
        <StatefulEditor
          initial={SKILLS_CV}
          onScrollRatio={onScrollRatio}
          syncRequest={{ offset: SKILLS_CV.length / 2 }}
        />,
      );
    });
    expect(textarea.scrollTop).toBe(400);

    fireEvent.scroll(textarea);
    expect(onScrollRatio).not.toHaveBeenCalled();
  });
});

describe('MarkdownEditor copy, download and upload', () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('copies the document to the clipboard and says so', () => {
    const writeText = vi.fn();
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
    render(<StatefulEditor initial={SKILLS_CV} />);

    fireEvent.click(screen.getByTitle('Copy Markdown'));
    expect(writeText).toHaveBeenCalledWith(SKILLS_CV);
    expect(screen.getByTitle('Copied!')).toBeTruthy();
  });

  it('downloads the document as a Markdown file', () => {
    global.URL.createObjectURL = vi.fn(() => 'blob:markdown');
    global.URL.revokeObjectURL = vi.fn();
    render(<StatefulEditor initial={SKILLS_CV} />);

    fireEvent.click(screen.getByTitle('Download .md file'));
    expect(global.URL.createObjectURL).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'text/markdown' }),
    );
  });

  it('ignores an upload dialog closed without a file', () => {
    const { container } = render(<StatefulEditor initial={SKILLS_CV} />);
    const input = container.querySelector('input[type="file"]');
    fireEvent.change(input, { target: { files: [] } });
    expect(screen.getByRole('textbox').value).toBe(SKILLS_CV);
  });
});

describe('MarkdownEditor cursor reporting', () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  const renderWithCursor = (onCursorOffset, markdown = CV) =>
    render(
      <MarkdownEditor
        markdown={markdown}
        setMarkdown={vi.fn()}
        sampleCVs={samplesFor('en')}
        lang="en"
        onSelectSample={vi.fn()}
        wordCount={42}
        savedDrafts={[]}
        onSaveDraft={vi.fn()}
        currentDraftName=""
        t={translations.en}
        searchOpen={false}
        setSearchOpen={vi.fn()}
        onCursorOffset={onCursorOffset}
      />,
    );

  const flushCursor = async () => {
    await act(async () => {
      await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    });
  };

  it('reports the caret when the mouse places it', async () => {
    const onCursorOffset = vi.fn();
    renderWithCursor(onCursorOffset);
    const textarea = screen.getByRole('textbox');
    textarea.setSelectionRange(10, 10);

    await act(async () => {
      fireEvent.click(textarea);
      await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    });

    expect(onCursorOffset).toHaveBeenCalledWith(10);
  });

  it('reports the caret when the keyboard moves it', async () => {
    const onCursorOffset = vi.fn();
    renderWithCursor(onCursorOffset);
    const textarea = screen.getByRole('textbox');
    textarea.setSelectionRange(20, 20);

    await act(async () => {
      fireEvent.keyUp(textarea, { key: 'ArrowLeft' });
      await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    });

    expect(onCursorOffset).toHaveBeenCalledWith(20);
  });

  it('reports the caret after an edit', async () => {
    const onCursorOffset = vi.fn();
    renderWithCursor(onCursorOffset);
    const textarea = screen.getByRole('textbox');

    await act(async () => {
      fireEvent.change(textarea, { target: { value: `${CV}\n- New line` } });
      await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    });

    expect(onCursorOffset).toHaveBeenCalledWith(expect.any(Number));
  });

  it('clears the report when the editor loses focus', async () => {
    const onCursorOffset = vi.fn();
    renderWithCursor(onCursorOffset);
    const textarea = screen.getByRole('textbox');
    textarea.setSelectionRange(5, 5);

    await act(async () => {
      fireEvent.click(textarea);
      await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    });
    fireEvent.blur(textarea);

    expect(onCursorOffset).toHaveBeenLastCalledWith(null);
  });

  it('works without anyone listening', async () => {
    renderWithCursor(undefined);
    const textarea = screen.getByRole('textbox');
    textarea.setSelectionRange(3, 3);

    await act(async () => {
      fireEvent.click(textarea);
      await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    });
    fireEvent.blur(textarea);
  });

  it('cancels a pending report on unmount', async () => {
    const onCursorOffset = vi.fn();
    const view = renderWithCursor(onCursorOffset);
    const textarea = screen.getByRole('textbox');
    textarea.setSelectionRange(7, 7);
    fireEvent.click(textarea);
    view.unmount();
    await flushCursor();
    expect(onCursorOffset).not.toHaveBeenCalled();
  });
});

describe('MarkdownEditor search highlighting and navigation', () => {
  afterEach(() => cleanup());

  const renderSearchEditor = (markdown = CV) => {
    let current = markdown;
    const setMarkdown = vi.fn((next) => {
      current = next;
    });
    const setSearchOpen = vi.fn();
    const view = render(
      <MarkdownEditor
        markdown={current}
        setMarkdown={setMarkdown}
        sampleCVs={samplesFor('en')}
        lang="en"
        onSelectSample={vi.fn()}
        wordCount={42}
        savedDrafts={[]}
        onSaveDraft={vi.fn()}
        currentDraftName=""
        t={translations.en}
        searchOpen={true}
        setSearchOpen={setSearchOpen}
      />,
    );
    return { setMarkdown, setSearchOpen, view };
  };

  it('renders highlights in the backdrop when matching query is typed', () => {
    renderSearchEditor('# Test\nEngineer at Acme\nSenior Engineer');
    const searchInput = screen.getByPlaceholderText(translations.en.searchPlaceholder);

    fireEvent.change(searchInput, { target: { value: 'Engineer' } });

    const backdrop = screen.getByTestId('editor-search-backdrop');
    expect(backdrop).not.toBeNull();
    const marks = backdrop.querySelectorAll('mark');
    expect(marks).toHaveLength(2);
    expect(marks[0].textContent).toBe('Engineer');
    expect(marks[0].getAttribute('data-match-current')).toBe('true');
    expect(marks[1].getAttribute('data-match-current')).toBeNull();
  });

  it('navigates through matches and updates the current active highlight', () => {
    renderSearchEditor('# Test\nEngineer at Acme\nSenior Engineer');
    const searchInput = screen.getByPlaceholderText(translations.en.searchPlaceholder);
    fireEvent.change(searchInput, { target: { value: 'Engineer' } });

    const nextBtn = screen.getByRole('button', { name: /Next match/i });
    fireEvent.click(nextBtn);

    const backdrop = screen.getByTestId('editor-search-backdrop');
    const marks = backdrop.querySelectorAll('mark');
    expect(marks[1].getAttribute('data-match-current')).toBe('true');
    expect(marks[0].getAttribute('data-match-current')).toBeNull();

    const prevBtn = screen.getByRole('button', { name: /Previous match/i });
    fireEvent.click(prevBtn);
    expect(marks[0].getAttribute('data-match-current')).toBe('true');
  });

  it('navigates with Enter and Shift+Enter in the search input', () => {
    renderSearchEditor('# Test\nEngineer at Acme\nSenior Engineer');
    const searchInput = screen.getByPlaceholderText(translations.en.searchPlaceholder);
    fireEvent.change(searchInput, { target: { value: 'Engineer' } });

    fireEvent.keyDown(searchInput, { key: 'Enter' });
    const backdrop = screen.getByTestId('editor-search-backdrop');
    let marks = backdrop.querySelectorAll('mark');
    expect(marks[1].getAttribute('data-match-current')).toBe('true');

    fireEvent.keyDown(searchInput, { key: 'Enter', shiftKey: true });
    marks = backdrop.querySelectorAll('mark');
    expect(marks[0].getAttribute('data-match-current')).toBe('true');
  });

  it('closes search when Escape is pressed or close button is clicked', () => {
    const { setSearchOpen } = renderSearchEditor('Some content');
    const searchInput = screen.getByPlaceholderText(translations.en.searchPlaceholder);

    fireEvent.keyDown(searchInput, { key: 'Escape' });
    expect(setSearchOpen).toHaveBeenCalledWith(false);

    const closeBtn = screen.getByRole('button', { name: /Close search/i });
    fireEvent.click(closeBtn);
    expect(setSearchOpen).toHaveBeenCalledWith(false);
  });
});

describe('MarkdownEditor save flow', () => {
  afterEach(() => cleanup());

  const renderWith = (props) =>
    render(
      <MarkdownEditor
        markdown={CV}
        setMarkdown={vi.fn()}
        sampleCVs={samplesFor('en')}
        lang="en"
        onSelectSample={vi.fn()}
        savedDrafts={[]}
        onSaveDraft={vi.fn()}
        currentDraftName=""
        t={translations.en}
        searchOpen={false}
        setSearchOpen={vi.fn()}
        {...props}
      />,
    );

  it('asks for a name the first time a CV is saved', () => {
    const onSaveDraft = vi.fn();
    renderWith({ onSaveDraft, currentDraftId: null });
    click(translations.en.save);
    expect(screen.getByRole('dialog')).toBeTruthy();
    expect(onSaveDraft).not.toHaveBeenCalled();
  });

  it('saves straight away once the CV already exists', () => {
    const onSaveDraft = vi.fn();
    renderWith({ onSaveDraft, currentDraftId: 'draft_1', currentDraftName: 'My CV' });
    click(translations.en.save);
    expect(onSaveDraft).toHaveBeenCalledWith('My CV');
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('flags unsaved changes on the save button', () => {
    const { unmount } = renderWith({ onSaveDraft: vi.fn(), currentDraftId: 'draft_1' });
    expect(screen.getByRole('button', { name: translations.en.save }).className).not.toMatch(
      /amber/,
    );
    unmount();
    renderWith({ onSaveDraft: vi.fn(), currentDraftId: 'draft_1', isUnsaved: true });
    expect(
      screen.getByRole('button', {
        name: `${translations.en.save} - ${translations.en.unsavedTooltip}`,
      }).className,
    ).toMatch(/amber/);
  });
});

describe('MarkdownEditor duplicate draft names', () => {
  afterEach(() => cleanup());

  const renderWith = (props) =>
    render(
      <MarkdownEditor
        markdown={CV}
        setMarkdown={vi.fn()}
        sampleCVs={samplesFor('en')}
        lang="en"
        onSelectSample={vi.fn()}
        savedDrafts={[{ id: 'draft_1', name: 'My CV', markdown: CV, updatedAt: '' }]}
        onSaveDraft={vi.fn()}
        currentDraftId={null}
        currentDraftName=""
        t={translations.en}
        searchOpen={false}
        setSearchOpen={vi.fn()}
        {...props}
      />,
    );

  it('refuses a name that is already taken and says so', () => {
    const onSaveDraft = vi.fn();
    renderWith({ onSaveDraft });
    click(translations.en.save);
    fireEvent.change(screen.getByRole('dialog').querySelector('input'), {
      target: { value: 'My CV' },
    });
    fireEvent.click(
      within(screen.getByRole('dialog')).getByRole('button', { name: translations.en.save }),
    );
    expect(screen.getByRole('alert').textContent).toContain(translations.en.saveNameTaken);
    expect(screen.getByRole('dialog')).toBeTruthy();
    expect(onSaveDraft).not.toHaveBeenCalled();
  });

  it('ignores case and surrounding spaces', () => {
    const onSaveDraft = vi.fn();
    renderWith({ onSaveDraft });
    click(translations.en.save);
    fireEvent.change(screen.getByRole('dialog').querySelector('input'), {
      target: { value: '  my cv  ' },
    });
    fireEvent.click(
      within(screen.getByRole('dialog')).getByRole('button', { name: translations.en.save }),
    );
    expect(onSaveDraft).not.toHaveBeenCalled();
  });

  it('saves a new CV when the name is free', () => {
    const onSaveDraft = vi.fn();
    renderWith({ onSaveDraft });
    click(translations.en.save);
    fireEvent.change(screen.getByRole('dialog').querySelector('input'), {
      target: { value: 'Another CV' },
    });
    fireEvent.click(
      within(screen.getByRole('dialog')).getByRole('button', { name: translations.en.save }),
    );
    expect(onSaveDraft).toHaveBeenCalledWith('Another CV', false);
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('blocks "save as new CV" when the name is already taken', () => {
    const onSaveDraft = vi.fn();
    renderWith({ onSaveDraft, currentDraftId: 'draft_1', currentDraftName: 'My CV' });
    click(translations.en.saveAs);
    fireEvent.click(
      within(screen.getByRole('dialog')).getByRole('button', { name: translations.en.save }),
    );
    expect(screen.getByRole('alert').textContent).toContain(translations.en.saveNameTaken);
    expect(onSaveDraft).not.toHaveBeenCalled();
  });

  it('renames on "save as new CV" with a free name', () => {
    const onSaveDraft = vi.fn();
    renderWith({ onSaveDraft, currentDraftId: 'draft_1', currentDraftName: 'My CV' });
    click(translations.en.saveAs);
    fireEvent.change(screen.getByRole('dialog').querySelector('input'), {
      target: { value: 'My CV v2' },
    });
    fireEvent.click(
      within(screen.getByRole('dialog')).getByRole('button', { name: translations.en.save }),
    );
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(onSaveDraft).toHaveBeenCalledWith('My CV v2', true);
  });
});

describe('MarkdownEditor delete saved CV', () => {
  afterEach(() => cleanup());

  const openLibrary = () => fireEvent.click(document.querySelector('[aria-haspopup="menu"]'));

  const renderWith = (props = {}) =>
    render(
      <MarkdownEditor
        markdown={CV}
        setMarkdown={vi.fn()}
        sampleCVs={[]}
        lang="en"
        onSelectSample={vi.fn()}
        savedDrafts={[{ id: 'draft_1', name: 'My CV', markdown: CV, updatedAt: '' }]}
        onSaveDraft={vi.fn()}
        onDeleteDraft={vi.fn()}
        currentDraftId={null}
        currentDraftName=""
        t={translations.en}
        searchOpen={false}
        setSearchOpen={vi.fn()}
        {...props}
      />,
    );

  it('offers a delete button for saved CVs only', () => {
    renderWith({ sampleCVs: [{ id: 's1', name: 'Blank', category: 'x', markdown: CV }] });
    openLibrary();
    expect(screen.getByRole('button', { name: `Delete CV: My CV` })).toBeTruthy();
    expect(screen.queryByRole('button', { name: /Delete CV: Blank/ })).toBeNull();
  });

  it('asks for confirmation inside the dropdown before deleting', () => {
    const onDeleteDraft = vi.fn();
    renderWith({ onDeleteDraft });
    openLibrary();
    fireEvent.click(screen.getByRole('button', { name: `Delete CV: My CV` }));
    expect(onDeleteDraft).not.toHaveBeenCalled();
    expect(screen.getByRole('menu')).toBeTruthy();
    expect(screen.getByText(translations.en.confirmDeleteDraft)).toBeTruthy();
    fireEvent.click(
      within(screen.getByRole('menu')).getByRole('button', { name: translations.en.deleteDraft }),
    );
    expect(onDeleteDraft).toHaveBeenCalledWith('draft_1');
  });

  it('cancels the deletion and keeps the dropdown open', () => {
    const onDeleteDraft = vi.fn();
    renderWith({ onDeleteDraft });
    openLibrary();
    fireEvent.click(screen.getByRole('button', { name: `Delete CV: My CV` }));
    fireEvent.click(
      within(screen.getByRole('menu')).getByRole('button', { name: translations.en.cancel }),
    );
    expect(onDeleteDraft).not.toHaveBeenCalled();
    expect(screen.getByRole('menu')).toBeTruthy();
    expect(screen.getByRole('button', { name: `Delete CV: My CV` })).toBeTruthy();
  });

  it('still opens the CV when clicking the row itself', () => {
    const onSelectSample = vi.fn();
    renderWith({ onSelectSample });
    openLibrary();
    fireEvent.click(screen.getByRole('menuitem', { name: /My CV/ }));
    expect(onSelectSample).toHaveBeenCalledWith('draft:draft_1');
  });

  it('marks the draft that is currently open', () => {
    renderWith({ currentDraftId: 'draft_1', currentDraftName: 'My CV' });
    openLibrary();
    expect(screen.getByText(translations.en.openDraft)).toBeTruthy();
  });
});
