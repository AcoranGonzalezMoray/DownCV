import { describe, expect, it, beforeEach } from 'vitest';
import { parseMarkdownToATS } from '../../src/utils/markdownParser';
import { resolveSelection, createRangeForSourceRange } from '../../src/utils/markdownSelection';
import {
  applyAlign,
  applyHeading,
  applyInlineFormat,
  applyLink,
  applyList,
  clearFormatting,
  getBlockState,
  isInlineActive,
} from '../../src/utils/markdownFormat';

function renderPreview(markdown) {
  const paper = document.createElement('div');
  paper.className = 'cv-paper';
  paper.innerHTML = parseMarkdownToATS(markdown);
  document.body.appendChild(paper);
  return paper;
}

function textNodes(paper) {
  const nodes = [];
  const walker = document.createTreeWalker(paper, 4);
  let node;
  while ((node = walker.nextNode())) {
    nodes.push(node);
  }
  return nodes;
}


function selectText(paper, needle, occurrence = 1) {
  let seen = 0;
  for (const node of textNodes(paper)) {
    const index = node.nodeValue.indexOf(needle);
    if (index === -1) {
      continue;
    }
    seen += 1;
    if (seen < occurrence) {
      continue;
    }
    const range = document.createRange();
    range.setStart(node, index);
    range.setEnd(node, index + needle.length);
    const selection = window.getSelection();
    selection.removeAllRanges();
    selection.addRange(range);
    return range;
  }
  throw new Error(`"${needle}" not found in the preview`);
}

describe('parseMarkdownToATS', () => {
  it('maps every block to its markdown offsets', () => {
    const html = parseMarkdownToATS('# Name\n\n## Section\n\ntext');
    expect(html).toContain(
      'data-cv-start="0" data-cv-end="8" data-cv-content-start="2" data-cv-content-end="6"',
    );
    expect(html).toContain(
      'data-cv-start="8" data-cv-end="20" data-cv-content-start="11" data-cv-content-end="18"',
    );
    expect(html).toContain('data-cv-start="20" data-cv-end="24"');
  });

  it('maps a multi line list to the block and its content', () => {
    const html = parseMarkdownToATS('- one\n- two\n');
    expect(html).toContain('data-cv-start="0" data-cv-end="12"');
    expect(html).toContain('data-cv-content-start="2" data-cv-content-end="11"');
  });

  it('renders __text__ as underline instead of bold', () => {
    expect(parseMarkdownToATS('a __b__ c')).toContain('<u>b</u>');
  });

  it('renders the ATS classes for headings, lists and rules', () => {
    const html = parseMarkdownToATS('## Section\n\n- one\n- two\n\n---');
    expect(html).toContain('class="cv-section-title"');
    expect(html).toContain('class="cv-list"');
    expect(html).toContain('class="cv-separator"');
  });
});

describe('resolveSelection', () => {
  const markdown =
    '# Carlos Mendoza\n**Senior Engineer**\n\n## EXPERIENCIA\n- Managed the [project](https://x.com) with `code`\n- Second item\n';

  let paper;
  beforeEach(() => {
    document.body.innerHTML = '';
    paper = renderPreview(markdown);
  });

  it('maps a selection inside a heading to the source without markup', () => {
    const selection = resolveSelection(paper, selectText(paper, 'Carlos'), markdown);
    expect(markdown.slice(selection.start, selection.end)).toBe('Carlos');
    expect(markdown.slice(selection.blockStart, selection.blockEnd).trim()).toBe(
      '# Carlos Mendoza',
    );
  });

  it('flags a full block selection', () => {
    const range = document.createRange();
    range.selectNodeContents(paper.querySelector('h1'));
    const selection = resolveSelection(paper, range, markdown);
    expect(selection.whole).toBe(true);
    expect(markdown.slice(selection.start, selection.end)).toBe('Carlos Mendoza');
  });

  it('maps a selection inside a list item skipping the link url', () => {
    const selection = resolveSelection(paper, selectText(paper, 'project'), markdown);
    expect(markdown.slice(selection.start, selection.end)).toBe('project');
    expect(selection.blockStart).toBe(markdown.indexOf('- Managed'));
  });
  it('returns null for a collapsed selection', () => {
    const range = document.createRange();
    range.collapse(true);
    expect(resolveSelection(paper, range, markdown)).toBeNull();
  });
});

describe('inline formats', () => {
  const markdown = 'Hello world of CVs';

  it('wraps and unwraps bold', () => {
    const applied = applyInlineFormat(markdown, { start: 6, end: 11 }, 'bold');
    expect(applied.markdown).toBe('Hello **world** of CVs');
    expect(applied.markdown.slice(applied.range.start, applied.range.end)).toBe('world');
    expect(isInlineActive(applied.markdown, { start: 8, end: 13 }, 'bold')).toBe(true);

    const removed = applyInlineFormat(applied.markdown, { start: 8, end: 13 }, 'bold');
    expect(removed.markdown).toBe(markdown);
  });

  it('makes a partially bold selection fully bold', () => {
    const source = '**Bold** text';
    const result = applyInlineFormat(source, { start: 2, end: 13 }, 'bold');
    expect(result.markdown).toBe('**Bold text**');
  });

  it('does not confuse a bold span with italics', () => {
    const source = '**Bold** text';
    const result = applyInlineFormat(source, { start: 2, end: 13 }, 'italic');
    expect(result.markdown).toBe('***Bold** text*');
  });

  it('keeps asterisks that are not markup', () => {
    const result = applyInlineFormat('5*3 = 15', { start: 0, end: 8 }, 'italic');
    expect(result.markdown).toBe('*5*3 = 15*');
  });

  it('inserts links', () => {
    const result = applyLink('see example', { start: 4, end: 11 }, 'https://x.com');
    expect(result.markdown).toBe('see [example](https://x.com)');
  });
});

describe('block formats', () => {
  it('converts a paragraph into a section and back', () => {
    const markdown = 'Some summary text';
    const range = { start: 0, end: 17, blockStart: 0, blockEnd: 17 };
    const heading = applyHeading(markdown, range, 2);
    expect(heading.markdown).toBe('## Some summary text');
    expect(getBlockState(heading.markdown, range).heading).toBe(2);
    expect(applyHeading(heading.markdown, range, 2).markdown).toBe(markdown);
  });

  it('turns several lines into a bullet list and back', () => {
    const markdown = 'first line\nsecond line';
    const range = { start: 0, end: 21, blockStart: 0, blockEnd: 21 };
    const list = applyList(markdown, range, 'bullet');
    expect(list.markdown).toBe('- first line\n- second line');
    expect(getBlockState(list.markdown, range).list).toBe('bullet');
    expect(applyList(list.markdown, range, 'bullet').markdown).toBe(markdown);
  });

  it('numbers a multi line selection', () => {
    const markdown = 'a\nb\nc';
    const range = { start: 0, end: 5, blockStart: 0, blockEnd: 5 };
    expect(applyList(markdown, range, 'ordered').markdown).toBe('1. a\n2. b\n3. c');
  });

  it('wraps and unwraps aligned blocks', () => {
    const markdown = '# Name\n\nbody';
    const range = { start: 0, end: 6, blockStart: 0, blockEnd: 6 };
    const centered = applyAlign(markdown, range, 'center');
    expect(centered.markdown).toBe('<div align="center">\n\n# Name\n\n</div>\n\nbody');

    const innerStart = centered.markdown.indexOf('# Name');
    const selection = {
      start: innerStart,
      end: innerStart + 6,
      blockStart: innerStart,
      blockEnd: innerStart + 6,
    };
    expect(getBlockState(centered.markdown, selection).align).toBe('center');
    expect(applyAlign(centered.markdown, selection, 'center').markdown).toBe(markdown);
  });

  it('keeps a blank line so the next block does not lose its markup', () => {
    const markdown = '# Carlos Mendoza\n\n**Desarrollador Full-Stack Senior**';
    const range = { start: 0, end: 16, blockStart: 0, blockEnd: 18 };
    const centered = applyAlign(markdown, range, 'center');
    expect(centered.markdown).toBe(
      '<div align="center">\n\n# Carlos Mendoza\n\n</div>\n\n**Desarrollador Full-Stack Senior**',
    );

    expect(parseMarkdownToATS(centered.markdown)).toContain(
      '<strong>Desarrollador Full-Stack Senior</strong>',
    );
  });

  it('unwraps a block that was glued to the next one', () => {
    const markdown = '<div align="center">\n\n# Name\n\n</div>**Bold**';
    const start = markdown.indexOf('# Name');
    const range = { start, end: start + 6, blockStart: start, blockEnd: start + 6 };
    expect(applyAlign(markdown, range, 'center').markdown).toBe('# Name\n\n**Bold**');
  });

  it('clears inline and block markup', () => {
    const markdown = '### **TechCorp**\n- *Fast* growth ~~stop~~ `code`';
    const range = { start: 0, end: markdown.length, blockStart: 0, blockEnd: markdown.length };
    expect(clearFormatting(markdown, range).markdown).toBe('TechCorp\nFast growth stop code');
  });
});

describe('createRangeForSourceRange', () => {
  it('rebuilds the DOM selection of a block range', () => {
    const markdown = '# Name\n\n## Section\n';
    document.body.innerHTML = '';
    const paper = renderPreview(markdown);
    const range = createRangeForSourceRange(paper, { start: 8, end: 19 });
    expect(range.toString()).toBe('Section');
    expect(resolveSelection(paper, range, markdown)).toMatchObject({ blockStart: 8, blockEnd: 19 });
  });

  it('rebuilds the DOM selection of a text range', () => {
    const markdown = '# Name\n\n## Section\n';
    document.body.innerHTML = '';
    const paper = renderPreview(markdown);
    const range = createRangeForSourceRange(paper, { start: 11, end: 14 }, 'Sec');
    expect(range.toString()).toBe('Sec');
  });
});

describe('preview round trip', () => {
  const markdown =
    '## EXPERIENCIA\n\n### **TechCorp** | Madrid\n**Lead** | *2022*\n- Managed the [project](https://x.com)\n- Second item\n';

  let paper;
  beforeEach(() => {
    document.body.innerHTML = '';
    paper = renderPreview(markdown);
  });

  function selectElement(element) {
    const range = document.createRange();
    range.selectNodeContents(element);
    return resolveSelection(paper, range, markdown);
  }

  it('promotes a selected paragraph to a section title', () => {
    const result = applyHeading(markdown, selectElement(paper.querySelector('p')), 2);
    expect(result.markdown).toBe(
      '## EXPERIENCIA\n\n### **TechCorp** | Madrid\n## **Lead** | *2022*\n- Managed the [project](https://x.com)\n- Second item\n',
    );
  });

  it('bolds a whole bullet item and restores the selection', () => {
    const selection = selectElement(paper.querySelector('li'));
    const result = applyInlineFormat(markdown, selection, 'bold');
    expect(result.markdown).toContain('- **Managed the [project](https://x.com)**');

    document.body.innerHTML = '';
    const nextPaper = renderPreview(result.markdown);
    const restored = createRangeForSourceRange(nextPaper, result.range, 'Managed the project');
    expect(restored.toString()).toBe('Managed the project');
    expect(resolveSelection(nextPaper, restored, result.markdown).blockStart).toBe(
      markdown.indexOf('- Managed'),
    );
  });

  it('turns the title and the role of a block into a numbered list', () => {
    const range = document.createRange();
    range.setStartBefore(paper.querySelector('.cv-entry-title'));
    range.setEndAfter(paper.querySelector('p'));
    const selection = resolveSelection(paper, range, markdown);
    expect(applyList(markdown, selection, 'ordered').markdown).toContain(
      '1. **TechCorp** | Madrid\n2. **Lead** | *2022*',
    );
  });

  it('clears the markup of a selected paragraph', () => {
    const result = clearFormatting(markdown, selectElement(paper.querySelector('p')));
    expect(result.markdown).toContain('Lead | 2022');
  });
});
