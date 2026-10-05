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
    for (const label of ['Experiencia', 'Educación', 'Habilidades', 'Certificación']) {
      expect(screen.getByRole('button', { name: new RegExp(`${label}$`) })).toBeTruthy();
    }
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
