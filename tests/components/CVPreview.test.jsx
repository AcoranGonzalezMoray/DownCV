import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, cleanup, act, fireEvent } from '@testing-library/react';
import CVPreview from '../../src/components/CVPreview';
import { scanContacts } from '../../src/utils/contactScan';
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

const MD =
  '# Ana Gomez\n\n[linkedin.com/in/ana](https://linkedin.com) and [my site](https://ana.dev)';

const noop = () => {};
const renderPreview = (markdown = MD) =>
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

const stubLayout = ({
  anchorWidth = 120,
  anchorLeft = 40,
  anchorTop = 100,
  paperWidth = 794,
  paperLeft = 0,
  paperTop = 0,
  
  blockStep = 0,
} = {}) => {
  const box = (left, top, width, height) => ({
    left,
    top,
    width,
    height,
    right: left + width,
    bottom: top + height,
    x: left,
    y: top,
  });
  const blockTop = function getBlockTop() {
    const parent = this.parentElement;
    if (!parent || !parent.classList?.contains('cv-paper-measure')) {
      return 0;
    }
    return Array.prototype.indexOf.call(parent.children, this) * blockStep;
  };
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function getBox() {
    if (this.classList?.contains('cv-paper')) {
      return box(paperLeft, paperTop, paperWidth, 1123);
    }
    return this.tagName === 'A' ? box(anchorLeft, anchorTop, anchorWidth, 18) : box(0, 0, 0, 0);
  });
  vi.spyOn(HTMLElement.prototype, 'offsetTop', 'get').mockImplementation(function getTop() {
    if (this.tagName === 'A') {
      return anchorTop;
    }
    if (this.classList?.contains('cv-paper')) {
      return paperTop;
    }
    return blockTop.call(this);
  });
  vi.spyOn(HTMLElement.prototype, 'offsetLeft', 'get').mockImplementation(function getLeft() {
    if (this.classList?.contains('cv-paper')) {
      return paperLeft;
    }
    return this.tagName === 'A' ? anchorLeft : 0;
  });
  vi.spyOn(HTMLElement.prototype, 'offsetWidth', 'get').mockImplementation(function getWidth() {
    if (this.classList?.contains('cv-paper')) {
      return paperWidth;
    }
    return this.tagName === 'A' ? anchorWidth : 0;
  });
  vi.spyOn(HTMLElement.prototype, 'offsetHeight', 'get').mockImplementation(function getHeight() {
    return this.classList?.contains('cv-paper') ? 1123 : 0;
  });
};

const reflow = async (patch) => {
  await act(async () => {
    stubLayout(patch);
    window.dispatchEvent(new Event('resize'));
    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  });
};

const verifyItem = (markdown, kind, value) => {
  const item = scanContacts(markdown).items.find(
    (entry) => entry.kind === kind && entry.value === value,
  );
  if (!item) {
    throw new Error(`the scanner did not find a ${kind} "${value}"`);
  }
  window.localStorage.setItem(
    'downcv_contact_verified',
    JSON.stringify({ [item.id]: new Date().toISOString() }),
  );
};

const markers = () => screen.queryAllByTitle(/open in a new tab/i);

describe('CVPreview verified link markers', () => {
  beforeEach(() => {
    window.localStorage.clear();
    stubLayout();
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('marks a verified link next to its position with a small round tag', () => {
    verifyItem(MD, 'link', 'linkedin.com/in/ana');
    renderPreview();

    const [marker, second] = markers();
    expect(marker).toBeTruthy();

    expect(second).toBeUndefined();
    expect(marker.getAttribute('href')).toBe('https://linkedin.com');
    expect(marker.getAttribute('target')).toBe('_blank');
    expect(marker.getAttribute('rel')).toBe('noreferrer noopener');
    expect(marker.style.top).toBe('98px');
    expect(marker.style.left).toBe('164px');
    expect(marker.style.width).toBe('18px');
    expect(marker.style.height).toBe('18px');

    expect(marker.textContent).toBe('');
    expect(marker.querySelector('svg')).toBeTruthy();
    expect(marker.getAttribute('title')).toBe('linkedin.com — Open in a new tab');
  });

  it('keeps the circle inside the page when the link reaches the right margin', () => {
    verifyItem(MD, 'link', 'linkedin.com/in/ana');
    renderPreview();

    cleanup();
    vi.restoreAllMocks();

    stubLayout({ anchorWidth: 120, anchorLeft: 700 });
    renderPreview();

    const [marker] = markers();

    expect(marker.style.left).toBe('678px');
    expect(marker.style.top).toBe('98px');
  });

  it('does not mark links that are still unverified', () => {
    renderPreview();
    expect(markers()).toHaveLength(0);
  });

  it('does not mark emails', () => {
    const markdown = '# Ana\n\n[ana@mail.com](mailto:ana@mail.com)';
    verifyItem(markdown, 'email', 'ana@mail.com');
    renderPreview(markdown);
    expect(markers()).toHaveLength(0);
  });

  it('moves the circle when the page reflows', async () => {
    verifyItem(MD, 'link', 'linkedin.com/in/ana');
    renderPreview();
    expect(markers()[0].style.top).toBe('98px');

    await reflow({ anchorWidth: 120, anchorLeft: 40, anchorTop: 300 });
    expect(markers()[0].style.top).toBe('298px');

    await reflow({ anchorWidth: 200, anchorLeft: 40, anchorTop: 320 });
    const [marker] = markers();
    expect(marker.style.top).toBe('318px');
    expect(marker.style.left).toBe('244px');
  });

  it('puts the circle inside its own sheet, wherever the sheet sits on screen', () => {
    verifyItem(MD, 'link', 'linkedin.com/in/ana');
    cleanup();
    vi.restoreAllMocks();
    
    stubLayout({ anchorWidth: 120, anchorLeft: 40, anchorTop: 100, paperLeft: 24, paperTop: 16 });
    renderPreview();

    const [marker] = markers();
    expect(marker.style.top).toBe('98px');
    expect(marker.style.left).toBe('164px');
    expect(marker.closest('.cv-page')).toBeTruthy();
  });

  it('marks a link on the second sheet as well, on its own sheet', () => {
    const long = Array.from(
      { length: 40 },
      (_, index) => `- Logro numero ${index} con metricas de sobra para llenar la pagina`,
    ).join('\n');
    const markdown = `# Ana Gomez\n\n## EXPERIENCIA\n\n${long}\n\n[linkedin.com/in/ana](https://linkedin.com)`;
    verifyItem(markdown, 'link', 'linkedin.com/in/ana');
    cleanup();
    vi.restoreAllMocks();
    
    stubLayout({ anchorWidth: 120, anchorLeft: 40, anchorTop: 100, blockStep: 380 });
    renderPreview(markdown);

    const sheets = document.querySelectorAll('.cv-page');
    expect(sheets.length).toBeGreaterThan(1);

    const [marker] = markers();
    expect(marker.closest('.cv-page')).toBe(sheets[sheets.length - 1]);
    expect(marker.style.top).toBe('98px');
  });

  it('keeps the circle on the page when a link falls outside it', () => {
    verifyItem(MD, 'link', 'linkedin.com/in/ana');
    cleanup();
    vi.restoreAllMocks();
    
    stubLayout({ anchorWidth: 120, anchorLeft: 40, anchorTop: 4000 });
    renderPreview();

    const [marker] = markers();
    expect(marker.style.top).toBe('1105px');
  });
});

const TWO_SECTIONS = `# Ana Gomez

## EXPERIENCIA

### Acme Corp | 2020 - 2024

- Led the migration that cut deploys by 45%

## EDUCACIÓN

### BSc | 2015 - 2019

- Computer science
`;

const renderWithSetter = (markdown) => {
  const setMarkdown = vi.fn();
  render(
    <CVPreview
      markdown={markdown}
      setMarkdown={setMarkdown}
      styles={styles}
      t={translations.en}
      undo={noop}
      redo={noop}
      canUndo={false}
      canRedo={false}
    />,
  );
  return setMarkdown;
};

const drag = (from, to) => {
  const dataTransfer = { effectAllowed: '', dropEffect: '', setData: vi.fn(), getData: () => '' };
  fireEvent.dragStart(from, { dataTransfer });
  fireEvent.dragOver(to, { dataTransfer });
  fireEvent.drop(to, { dataTransfer });
  fireEvent.dragEnd(from, { dataTransfer });
};

describe('CVPreview reordering sections', () => {
  beforeEach(() => {
    window.localStorage.clear();
    stubLayout();
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('does not touch the sections until the mode is on', () => {
    renderWithSetter(TWO_SECTIONS);
    const titles = document.querySelectorAll('.cv-pages h3.cv-section-title');
    expect(titles).toHaveLength(2);
    expect(titles[0].draggable).toBe(false);
    expect(titles[0].getAttribute('tabindex')).toBe(null);
  });

  it('makes every section title a handle when the mode is on', () => {
    renderWithSetter(TWO_SECTIONS);
    fireEvent.click(screen.getByRole('button', { name: /reorder sections/i }));

    const titles = document.querySelectorAll('.cv-pages h3.cv-section-title');
    expect(titles[0].draggable).toBe(true);
    expect(titles[0].getAttribute('tabindex')).toBe('0');
    expect(titles[0].classList.contains('cv-section-handle')).toBe(true);
    expect(screen.getByText(/drag a section/i)).toBeTruthy();
  });

  it('reorders the Markdown when a section is dropped on another one', () => {
    const setMarkdown = renderWithSetter(TWO_SECTIONS);
    fireEvent.click(screen.getByRole('button', { name: /reorder sections/i }));

    const [experience, education] = document.querySelectorAll('.cv-pages h3.cv-section-title');
    drag(experience, education);

    expect(setMarkdown).toHaveBeenCalledTimes(1);
    const next = setMarkdown.mock.calls[0][0];
    expect(next.indexOf('## EDUCACIÓN')).toBeLessThan(next.indexOf('## EXPERIENCIA'));

    expect(next.startsWith('# Ana Gomez')).toBe(true);
    expect(next).toContain('Led the migration that cut deploys by 45%');
    expect(next).toContain('### BSc | 2015 - 2019');
  });

  it('does nothing when a section is dropped on itself', () => {
    const setMarkdown = renderWithSetter(TWO_SECTIONS);
    fireEvent.click(screen.getByRole('button', { name: /reorder sections/i }));
    const [experience] = document.querySelectorAll('.cv-pages h3.cv-section-title');
    drag(experience, experience);
    expect(setMarkdown).not.toHaveBeenCalled();
  });

  it('moves a section with the arrow keys, for the keyboard path', () => {
    const setMarkdown = renderWithSetter(TWO_SECTIONS);
    fireEvent.click(screen.getByRole('button', { name: /reorder sections/i }));
    const [experience] = document.querySelectorAll('.cv-pages h3.cv-section-title');

    fireEvent.keyDown(experience, { key: 'ArrowDown' });

    expect(setMarkdown).toHaveBeenCalledTimes(1);
    const next = setMarkdown.mock.calls[0][0];
    expect(next.indexOf('## EDUCACIÓN')).toBeLessThan(next.indexOf('## EXPERIENCIA'));
  });

  it('allows reordering multiple sections sequentially until Done is clicked', () => {
    const THREE_SECTIONS = `# Ana Gomez\n\n## EXPERIENCIA\n\nExp content\n\n## EDUCACIÓN\n\nEdu content\n\n## PROYECTOS\n\nProj content\n`;
    const setMarkdown = renderWithSetter(THREE_SECTIONS);
    fireEvent.click(screen.getByRole('button', { name: /reorder sections/i }));

    const [experience, education, projects] = document.querySelectorAll('.cv-pages h3.cv-section-title');
    drag(experience, education);
    expect(setMarkdown).toHaveBeenCalledTimes(1);

    drag(projects, experience);
    expect(setMarkdown).toHaveBeenCalledTimes(2);

    // Section handles should remain active and draggable
    const updatedTitles = document.querySelectorAll('.cv-pages h3.cv-section-title');
    expect(updatedTitles[0].draggable).toBe(true);
    expect(updatedTitles[0].classList.contains('cv-section-handle')).toBe(true);
  });

  it('ignores the arrows when the mode is off', () => {
    const setMarkdown = renderWithSetter(TWO_SECTIONS);
    const [experience] = document.querySelectorAll('.cv-pages h3.cv-section-title');
    fireEvent.keyDown(experience, { key: 'ArrowDown' });
    expect(setMarkdown).not.toHaveBeenCalled();
  });
});

describe('CVPreview fits the sheet to the space it is given', () => {
  
  const stubPane = (width) => {
    vi.spyOn(Element.prototype, 'clientWidth', 'get').mockImplementation(function getWidth() {
      return this.classList?.contains('cv-paper-container') ? width : 0;
    });
  };
  const zoomOf = () => Number(document.querySelector('.cv-page').style.zoom);

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('zooms the page down to the width of a narrow pane', () => {
    stubPane(500);
    renderPreview();

    expect(zoomOf()).toBeCloseTo(500 / (210 * (96 / 25.4)), 2);
  });

  it('never zooms past the real size of the page', () => {
    stubPane(1400);
    renderPreview();

    expect(zoomOf()).toBe(1);
  });

  it('leaves the page alone while the pane is hidden', () => {
    stubPane(0);
    renderPreview();

    expect(zoomOf()).toBe(1);
  });

  it('never zooms down to a thumbnail', () => {
    stubPane(200);
    renderPreview();

    expect(zoomOf()).toBe(0.35);
  });
});

describe('CVPreview zoom of the page', () => {
  
  const stubPane = (width) => {
    vi.spyOn(Element.prototype, 'clientWidth', 'get').mockImplementation(function getWidth() {
      return this.classList?.contains('cv-paper-container') ? width : 0;
    });
  };
  const zoomOf = () => Number(document.querySelector('.cv-page').style.zoom);
  const fitted = 500 / (210 * (96 / 25.4));

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('brings the page closer with the magnifier and takes it back with the reset', () => {
    stubPane(500);
    renderPreview();
    expect(zoomOf()).toBeCloseTo(fitted, 2);

    fireEvent.click(screen.getByRole('button', { name: /zoom in/i }));
    expect(zoomOf()).toBeCloseTo(fitted * 1.2, 2);

    fireEvent.click(screen.getByRole('button', { name: /fit the page/i }));
    expect(zoomOf()).toBeCloseTo(fitted, 2);
  });

  it('walks back and forth in the same steps', () => {
    stubPane(500);
    renderPreview();

    fireEvent.click(screen.getByRole('button', { name: /zoom in/i }));
    fireEvent.click(screen.getByRole('button', { name: /zoom out/i }));

    expect(zoomOf()).toBeCloseTo(fitted, 2);
  });

  it('goes past the size that fits, because a page that fits can be unreadable', () => {
    stubPane(500);
    renderPreview();

    for (let i = 0; i < 12; i += 1) {
      fireEvent.click(screen.getByRole('button', { name: /zoom in/i }));
    }

    expect(zoomOf()).toBeGreaterThan(1);
  });

  it('cannot be turned into a thumbnail on purpose either', () => {
    stubPane(500);
    renderPreview();

    for (let i = 0; i < 12; i += 1) {
      fireEvent.click(screen.getByRole('button', { name: /zoom out/i }));
    }

    expect(zoomOf()).toBe(0.35);
  });

  it('keeps the three magnifiers out of the printed page', () => {
    stubPane(500);
    renderPreview();

    const magnifiers = ['zoom in', 'zoom out', 'fit the page'].map((name) =>
      screen.getByRole('button', { name: new RegExp(name, 'i') }),
    );
    magnifiers.forEach((button) => {
      const stack = button.closest('.no-print');
      expect(stack, 'the magnifiers must live in a no-print stack').toBeTruthy();
      expect(stack.className).toMatch(/absolute/);
    });
  });
});

describe('CVPreview spacer measurement', () => {
  const SPACED_CV = `# Ana Gomez\n\nana@example.com | Madrid\n\n<br>\n\n## EXPERIENCIA\n\n### Acme\n\n- Logro con metricas\n\n<br>\n\n## EDUCACION\n\n### BSc\n`;

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('does not invent pages when a lone <br> spacer reports no offset, as Chrome does', async () => {
    vi.spyOn(HTMLElement.prototype, 'offsetTop', 'get').mockImplementation(function getTop() {
      const parent = this.parentElement;
      if (!parent?.classList?.contains('cv-paper-measure')) {
        return 0;
      }
      if (this.tagName === 'BR') {
        return 0;
      }
      return Array.prototype.indexOf.call(parent.children, this) * 100;
    });
    vi.spyOn(HTMLElement.prototype, 'offsetHeight', 'get').mockImplementation(function getHeight() {
      return this.tagName === 'BR' ? 0 : 100;
    });

    renderPreview(SPACED_CV);
    await act(async () => {
      await new Promise((resolve) => requestAnimationFrame(resolve));
    });

    const spacers = document.querySelectorAll('.cv-paper-measure > br');
    expect(spacers.length).toBeGreaterThan(0);
    expect(document.querySelectorAll('.cv-pages .cv-page').length).toBe(1);
  });

  it('reports the page count, so the ATS panel can fit the sheet the user sees', async () => {
    const onPageCount = vi.fn();
    vi.spyOn(HTMLElement.prototype, 'offsetTop', 'get').mockImplementation(function getTop() {
      const parent = this.parentElement;
      if (this.tagName === 'BR' || !parent?.classList?.contains('cv-paper-measure')) {
        return 0;
      }
      return Array.prototype.indexOf.call(parent.children, this) * 100;
    });
    vi.spyOn(HTMLElement.prototype, 'offsetHeight', 'get').mockImplementation(function getHeight() {
      return this.tagName === 'BR' ? 0 : 100;
    });

    render(
      <CVPreview
        markdown={SPACED_CV}
        setMarkdown={noop}
        styles={styles}
        t={translations.en}
        undo={noop}
        redo={noop}
        canUndo={false}
        canRedo={false}
        onPageCount={onPageCount}
      />,
    );
    await act(async () => {
      await new Promise((resolve) => requestAnimationFrame(resolve));
    });

    expect(onPageCount).toHaveBeenLastCalledWith(1);
  });
});

describe('CVPreview page navigation', () => {
  
  const LONG_CV = `# Ana Gomez\n\n${Array.from(
    { length: 30 },
    (_, i) => `### Empresa ${i}\n\n- Logro ${i} con una cifra del ${i}0%\n`,
  ).join('\n')}`;

  const renderStacked = async () => {
    vi.spyOn(HTMLElement.prototype, 'offsetTop', 'get').mockImplementation(function getTop() {
      const parent = this.parentElement;
      if (parent?.classList?.contains('cv-paper-measure')) {
        return Array.prototype.indexOf.call(parent.children, this) * 380;
      }
      return 0;
    });
    renderPreview(LONG_CV);
    await act(async () => {
      await new Promise((resolve) => requestAnimationFrame(resolve));
    });
  };

  const stubPane = () => {
    const SHEET = 1123;
    const DESK = 20;
    const box = (top) => ({
      top,
      bottom: top + SHEET,
      height: SHEET,
      width: 794,
      left: 0,
      right: 794,
    });
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function getBox() {

      if (this.classList?.contains('cv-paper-measure')) {
        return box(-100000);
      }
      if (this.classList?.contains('cv-page-container')) {
        return box(0);
      }
      const frame = this.closest?.('.cv-page');
      if (frame) {
        
        const container = document.querySelector('.cv-paper-container');
        return box((Number(frame.dataset.page) - 1) * (SHEET + DESK) - (container?.scrollTop || 0));
      }
      if (this.tagName === 'A') {
        return box(0);
      }
      return box(0);
    });
    const container = document.querySelector('.cv-paper-container');
    Object.defineProperty(container, 'scrollHeight', { value: 20000, configurable: true });
    Object.defineProperty(container, 'clientHeight', { value: 400, configurable: true });
    return { container, sheet: SHEET + DESK };
  };

  const rail = () => screen.getByRole('navigation', { name: /Pages of the CV/ });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('draws the whole CV as a stack of sheets, and offers a rail to walk it', async () => {
    await renderStacked();
    expect(document.querySelectorAll('.cv-page').length).toBeGreaterThan(4);
    expect(rail().querySelectorAll('li').length).toBeGreaterThan(4);
  });

  it('scrolls the pane to the sheet that was pressed, not to a sheet near it', async () => {
    await renderStacked();
    const { container, sheet } = stubPane();

    fireEvent.click(rail().querySelectorAll('li')[4].querySelector('button'));
    expect(container.scrollTop).toBe(4 * sheet - 8);
  });

  it('scrolls to the very last sheet when the last one is pressed', async () => {
    await renderStacked();
    const { container, sheet } = stubPane();

    const sheets = rail().querySelectorAll('li');
    fireEvent.click(sheets[sheets.length - 1].querySelector('button'));
    expect(container.scrollTop).toBe((sheets.length - 1) * sheet - 8);
  });

  it('never scrolls above the top of the document', async () => {
    await renderStacked();
    const { container } = stubPane();

    fireEvent.click(rail().querySelector('li button'));
    expect(container.scrollTop).toBe(0);
  });

  it('still lands on the right sheet when the pane is already scrolled', async () => {
    
    await renderStacked();
    const { container, sheet } = stubPane();
    container.scrollTop = 1000;

    fireEvent.click(rail().querySelectorAll('li')[4].querySelector('button'));
    expect(container.scrollTop).toBe(4 * sheet - 8);
  });

  it('says which sheet the reader is on, as the pane is scrolled', async () => {
    await renderStacked();
    const { container, sheet } = stubPane();

    container.scrollTop = 6 * sheet;
    await act(async () => {
      container.dispatchEvent(new Event('scroll'));
      await new Promise((resolve) => requestAnimationFrame(resolve));
    });

    expect(screen.getByRole('button', { current: 'page' }).textContent).toContain('7');
  });

  it('has no rail to walk when the CV fits on one sheet', () => {
    renderPreview(MD);
    expect(screen.queryByRole('navigation', { name: /Pages of the CV/ })).toBe(null);
  });
});

describe('CVPreview the gesture follows the size of the page', () => {
  const stubRealScreen = () => {
    vi.spyOn(Element.prototype, 'clientWidth', 'get').mockImplementation(function getWidth() {
      return this.classList?.contains('cv-paper-container') ? 600 : 0;
    });
    vi.spyOn(Element.prototype, 'clientHeight', 'get').mockImplementation(function getHeight() {
      return this.classList?.contains('cv-paper-container') ? 800 : 0;
    });
    vi.spyOn(Element.prototype, 'scrollWidth', 'get').mockImplementation(function getWidth() {
      return this.classList?.contains('cv-paper-container') ? 794 : 0;
    });
    vi.spyOn(Element.prototype, 'scrollHeight', 'get').mockImplementation(function getHeight() {
      return this.classList?.contains('cv-paper-container') ? 1187 : 0;
    });
  };

  const sheet = () => document.querySelector('.cv-page .cv-paper');
  const handButton = () => screen.queryByRole('button', { name: /select text|move the page/i });
  const zoomIn = () => fireEvent.click(screen.getByRole('button', { name: /zoom in/i }));

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('opens selecting text on an ordinary screen, page taller than the pane', () => {
    
    stubRealScreen();
    renderPreview();

    expect(sheet().className).not.toMatch(/cursor-grab/);
    expect(handButton()).toBe(null);
  });

  it('takes the drag as soon as the page is zoomed, with no button pressed', () => {
    stubRealScreen();
    renderPreview();
    expect(sheet().className).not.toMatch(/cursor-grab/);

    zoomIn();
    expect(sheet().className).toMatch(/cursor-grab/);
    expect(handButton().getAttribute('aria-label')).toMatch(/select text/i);
  });

  it('gives the words back on demand while the page stays zoomed', () => {
    stubRealScreen();
    renderPreview();
    zoomIn();
    expect(sheet().className).toMatch(/cursor-grab/);

    fireEvent.click(screen.getByRole('button', { name: /select text/i }));
    expect(sheet().className).not.toMatch(/cursor-grab/);

    expect(handButton().getAttribute('aria-label')).toMatch(/move the page/i);
  });

  it('goes back to selecting text when the page is returned to the size that fits', () => {
    stubRealScreen();
    renderPreview();
    zoomIn();
    expect(sheet().className).toMatch(/cursor-grab/);

    fireEvent.click(screen.getByRole('button', { name: /fit the page/i }));
    expect(sheet().className).not.toMatch(/cursor-grab/);
    expect(handButton()).toBe(null);
  });
});

describe('CVPreview the magnifiers stay pinned while reading', () => {
  const stack = () => screen.getByRole('button', { name: /zoom in/i }).closest('.no-print');
  const pane = () => document.querySelector('.cv-paper-container');

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it('stays in the corner of the preview instead of travelling with the document', () => {
    renderPreview();
    expect(pane().contains(stack())).toBe(false);
    expect(stack().className).toMatch(/absolute/);
    expect(stack().className).toMatch(/bottom-4/);
  });

  it('is on screen when the document is still', () => {
    renderPreview();
    expect(stack().className).not.toMatch(/opacity-0/);
  });

  it('stays visible while the pane scrolls', async () => {
    renderPreview();

    await act(async () => {
      pane().dispatchEvent(new Event('scroll'));
    });

    expect(stack().className).not.toMatch(/opacity-0/);
    expect(stack().className).not.toMatch(/pointer-events-none/);
  });

  it('stays visible while the reader keeps scrolling', async () => {
    renderPreview();

    for (let tick = 0; tick < 5; tick += 1) {
      await act(async () => {
        pane().dispatchEvent(new Event('scroll'));
      });
      expect(stack().className).not.toMatch(/opacity-0/);
    }
  });

  it('stays visible on a wheel over the page, which is how a document is read', async () => {
    renderPreview();

    await act(async () => {
      pane().scrollTop = 300;
      pane().dispatchEvent(new Event('scroll'));
    });

    expect(stack().className).not.toMatch(/opacity-0/);
  });

  it('is still out of the printed page wherever it is pinned', () => {
    renderPreview();

    expect(stack().className).toMatch(/no-print/);
  });
});

describe('CVPreview drag of the page', () => {
  
  const stubPane = (width, overflow = {}) => {
    const sizes = {
      scrollWidth: width,
      scrollHeight: 400,
      clientWidth: width,
      clientHeight: 400,
      ...overflow,
    };
    vi.spyOn(Element.prototype, 'clientWidth', 'get').mockImplementation(function getWidth() {
      return this.classList?.contains('cv-paper-container') ? sizes.clientWidth : 0;
    });
    vi.spyOn(Element.prototype, 'clientHeight', 'get').mockImplementation(function getHeight() {
      return this.classList?.contains('cv-paper-container') ? sizes.clientHeight : 0;
    });
    vi.spyOn(Element.prototype, 'scrollWidth', 'get').mockImplementation(function getScrollWidth() {
      return this.classList?.contains('cv-paper-container') ? sizes.scrollWidth : 0;
    });
    vi.spyOn(Element.prototype, 'scrollHeight', 'get').mockImplementation(
      function getScrollHeight() {
        return this.classList?.contains('cv-paper-container') ? sizes.scrollHeight : 0;
      },
    );
  };
  const pane = () => document.querySelector('.cv-paper-container');
  const grab = (from, to) => {
    fireEvent.pointerDown(from, { pointerId: 1, button: 0, clientX: 100, clientY: 100, ...p });
    fireEvent.pointerMove(pane(), { pointerId: 1, clientX: to.x, clientY: to.y, ...p });
    fireEvent.pointerUp(pane(), { pointerId: 1, clientX: to.x, clientY: to.y, ...p });
  };
  let p;
  let capture;

  beforeEach(() => {
    window.localStorage.clear();
    stubLayout();

    window.PointerEvent = window.MouseEvent;
    
    capture = vi.fn();
    Element.prototype.setPointerCapture = capture;
    p = { pointerType: 'mouse' };
  });

  afterEach(() => {
    delete Element.prototype.setPointerCapture;
    cleanup();
    vi.restoreAllMocks();
  });

  it('moves the page with the pointer once it is bigger than the pane', () => {
    stubPane(500, { scrollWidth: 2000, scrollHeight: 400 });
    renderPreview();
    
    fireEvent.click(screen.getByRole('button', { name: /zoom in/i }));
    const paper = document.querySelector('.cv-page .cv-paper');

    grab(paper, { x: 60, y: 80 });

    expect(pane().scrollLeft).toBe(40);
    expect(pane().scrollTop).toBe(20);
    expect(capture).toHaveBeenCalled();
  });

  it('does not move a page that has not been zoomed, because the drag is a selection', () => {
    
    stubPane(500, { scrollWidth: 2000, scrollHeight: 400 });
    renderPreview();

    grab(document.querySelector('.cv-page .cv-paper'), { x: 10, y: 10 });

    expect(pane().scrollLeft).toBe(0);
    expect(pane().scrollTop).toBe(0);
  });

  it('leaves the selection of a phrase alone: the drag starts on the words', () => {
    stubPane(500, { scrollWidth: 2000, scrollHeight: 400 });
    renderPreview();
    fireEvent.click(screen.getByRole('button', { name: /zoom in/i }));
    
    fireEvent.click(screen.getByRole('button', { name: /select text/i }));

    const words = document.querySelector('.cv-page .cv-paper p');
    grab(words, { x: 0, y: 0 });

    expect(pane().scrollLeft).toBe(0);
    expect(pane().scrollTop).toBe(0);
  });

  it('moves the page dragging the words, because that is what a drag is for here', () => {
    stubPane(500, { scrollWidth: 2000, scrollHeight: 400 });
    renderPreview();
    fireEvent.click(screen.getByRole('button', { name: /zoom in/i }));

    grab(document.querySelector('.cv-page .cv-paper p'), { x: 60, y: 90 });

    expect(pane().scrollLeft).toBe(40);
    expect(pane().scrollTop).toBe(10);
  });

  it('offers the hand only once there is a page to move by dragging', () => {
    stubPane(500);
    renderPreview();
    expect(document.querySelector('.cv-page .cv-paper').className).not.toMatch(/cursor-grab/);
    expect(screen.queryByRole('button', { name: /select text|move the page/i })).toBe(null);

    cleanup();
    stubPane(500, { scrollWidth: 2000 });
    renderPreview();
    
    expect(document.querySelector('.cv-page .cv-paper').className).not.toMatch(/cursor-grab/);
    fireEvent.click(screen.getByRole('button', { name: /zoom in/i }));
    expect(document.querySelector('.cv-page .cv-paper').className).toMatch(/cursor-grab/);
    expect(screen.getByRole('button', { name: /select text/i })).toBeTruthy();
  });

  it('leaves the magnifiers clickable: the drag must not swallow their click', () => {
    stubPane(500, { scrollWidth: 2000, scrollHeight: 400 });
    renderPreview();
    const zoomIn = screen.getByRole('button', { name: /zoom in/i });
    const before = Number(document.querySelector('.cv-page').style.zoom);

    fireEvent.pointerDown(zoomIn, { pointerId: 1, button: 0, clientX: 10, clientY: 10, ...p });
    expect(capture, 'the magnifier must not start a drag of the page').not.toHaveBeenCalled();
    expect(pane().className).not.toMatch(/cursor-grabbing/);
    fireEvent.pointerUp(zoomIn, { pointerId: 1, button: 0, clientX: 10, clientY: 10, ...p });
    fireEvent.click(zoomIn);

    expect(Number(document.querySelector('.cv-page').style.zoom)).toBeGreaterThan(before);
    expect(pane().scrollLeft).toBe(0);
  });
});

describe('CVPreview cursor line', () => {
  const renderWithCursor = (cursorRequest, markdown = MD) =>
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
        cursorRequest={cursorRequest}
      />,
    );

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('marks nothing while the caret is nowhere', () => {
    renderPreview();
    expect(document.querySelector('.cv-cursor-line')).toBe(null);
  });

  it('marks the block the editor caret stands on', () => {
    renderWithCursor({ offset: 0, nonce: 1 });
    const marks = document.querySelectorAll('.cv-page .cv-cursor-line');
    expect(marks).toHaveLength(1);
    expect(marks[0].textContent).toContain('Ana Gomez');
  });

  it('moves the mark when the caret moves, keeping a single one', () => {
    const view = renderWithCursor({ offset: 0, nonce: 1 });
    const first = document.querySelector('.cv-cursor-line');
    view.rerender(
      <CVPreview
        markdown={MD}
        setMarkdown={noop}
        styles={styles}
        t={translations.en}
        undo={noop}
        redo={noop}
        canUndo={false}
        canRedo={false}
        cursorRequest={{ offset: MD.length, nonce: 2 }}
      />,
    );
    const marks = document.querySelectorAll('.cv-cursor-line');
    expect(marks).toHaveLength(1);
    expect(marks[0]).not.toBe(first);
  });

  it('clears the mark when the editor loses the caret', () => {
    const view = renderWithCursor({ offset: 0, nonce: 1 });
    expect(document.querySelector('.cv-cursor-line')).toBeTruthy();
    view.rerender(
      <CVPreview
        markdown={MD}
        setMarkdown={noop}
        styles={styles}
        t={translations.en}
        undo={noop}
        redo={noop}
        canUndo={false}
        canRedo={false}
        cursorRequest={null}
      />,
    );
    expect(document.querySelector('.cv-cursor-line')).toBe(null);
  });

  it('re-glues the mark after an edit rebuilds the sheets', () => {
    const view = renderWithCursor({ offset: 0, nonce: 1 });
    expect(document.querySelector('.cv-cursor-line')).toBeTruthy();
    view.rerender(
      <CVPreview
        markdown={`# Ana Gomez edited\n\n${MD}`}
        setMarkdown={noop}
        styles={styles}
        t={translations.en}
        undo={noop}
        redo={noop}
        canUndo={false}
        canRedo={false}
        cursorRequest={{ offset: 0, nonce: 1 }}
      />,
    );
    expect(document.querySelectorAll('.cv-cursor-line')).toHaveLength(1);
  });
});
