import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const css = readFileSync(resolve(process.cwd(), 'src/index.css'), 'utf8');
const preview = readFileSync(resolve(process.cwd(), 'src/components/CVPreview.jsx'), 'utf8');
const app = readFileSync(resolve(process.cwd(), 'src/App.jsx'), 'utf8');


const rulesFor = (selector) => {
  const pattern = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/["']/g, '["\']');
  return [...css.matchAll(new RegExp(`([^{}]*${pattern}[^{}]*)\\{([^}]*)\\}`, 'g'))].map(
    (match) => ({ selector: match[1].trim(), body: match[2] }),
  );
};

describe('the space between sections', () => {
  
  it('hangs from the section heading, which is what the preview renders', () => {
    const [rule] = rulesFor('h3.cv-section-title').filter((entry) =>
      entry.body.includes('--cv-section-gap'),
    );
    expect(rule, 'no rule gives the section heading the section gap').toBeTruthy();
    expect(rule.body).toMatch(/margin-top:\s*var\(--cv-section-gap\)/);
  });

  it('does not depend on a section wrapper the markdown parser never emits', () => {
    expect(css).not.toMatch(/section\.cv-section\s*\{/);
    expect(rulesFor(':has(+ h3.cv-section-title)').length).toBeGreaterThan(0);
  });

  it('is fed by the value the slider moves', () => {
    expect(preview).toMatch(/'--cv-section-gap':\s*`\$\{styles\.sectionGap\}px`/);
    expect(css).toMatch(/--cv-section-gap:\s*16px;/);
  });
});

describe('the sheet of the preview', () => {
  
  it('has a shadow in light mode strong enough to draw the edge of the page', () => {
    const [rule] = rulesFor('[data-theme="light"] .cv-paper');
    expect(rule, 'no rule gives the sheet a shadow of its own in light mode').toBeTruthy();
    expect(rule.body).toMatch(/box-shadow:/);
    expect(rule.body).not.toMatch(/box-shadow:\s*none/);
  });

  it('prints at the real size, never at the zoom of the pane', () => {
    const printed = css.slice(css.indexOf('@media print'));
    expect(printed).toMatch(/\.cv-paper\s*\{[^}]*zoom:\s*1\s*!important/);
  });

  it('prints every sheet, because the app shell cannot clip the stack', () => {
    const printed = css.slice(css.indexOf('@media print'));
    const [rule] = rulesFor('.app-shell,');
    expect(rule, 'no print rule releases the app shell').toBeTruthy();
    expect(rule.body).toMatch(/height:\s*auto\s*!important/);
    expect(rule.body).toMatch(/overflow:\s*visible\s*!important/);
    expect(printed).toMatch(/\.app-main/);
    expect(printed).toMatch(/\.app-preview-body/);
    expect(app).toMatch(/app-shell/);
    expect(preview).toMatch(/app-preview-body/);
  });

  it('takes the accent colour from the style panel, using the name the sheet reads', () => {
    expect(preview).toMatch(/'--cv-paper-primary':\s*styles\.primaryColor/);
    expect(preview).toMatch(/'--cv-paper-text':\s*styles\.textColor/);
    expect(preview).toMatch(/'--cv-paper-subtext':\s*styles\.subtextColor/);
    expect(css).toMatch(/color:\s*var\(--cv-paper-primary\)/);
  });

  it('draws the minimalist heading with the thinnest rule of every option', () => {
    const widthOf = (selector) =>
      Number(/([\d.]+)px/.exec(rulesFor(selector)[0].body)[1]);
    const widths = [
      widthOf('.border-style-minimal h3.cv-section-title'),
      widthOf('.border-style-line h3.cv-section-title'),
      widthOf('.border-style-double h3.cv-section-title'),
      widthOf('.border-style-thick-left h3.cv-section-title'),
    ];

    // Browsers paint borders on whole pixels, so a fractional rule would land
    // on the same line as the solid one.
    expect(widths.every((width) => Number.isInteger(width))).toBe(true);
    expect(widths[0]).toBeLessThan(widths[1]);
    expect(widths[0]).toBeLessThan(widths[2]);
    expect(widths[0]).toBeLessThan(widths[3]);
    expect(Math.min(...widths)).toBe(widths[0]);
    expect(preview).toMatch(/'--cv-paper-border':\s*`color-mix/);
  });
});

describe('the bar of actions', () => {
  it('keeps every label on one line, so the bar does not grow a second row', () => {
    const header = app.slice(app.indexOf('<header'), app.indexOf('</header>'));
    
    const classes = [
      ...header.matchAll(/<button[\s\S]*?className=(?:"([^"]*)"|\{`([^`]*)`\})/g),
    ].map((match) => match[1] || match[2] || '');
    expect(classes.length).toBeGreaterThan(4);
    const wrapped = classes.filter((value) => !value.includes('whitespace-nowrap'));
    expect(wrapped, `these topbar buttons may wrap: ${wrapped.join(' | ')}`).toHaveLength(0);
  });

  it('drops the text of the quietest controls before it drops the controls', () => {
    
    expect(app).toMatch(/className="hidden min-\[1700px\]:inline">\{t\.stylesTab\}/);
    expect(app).toMatch(/className="hidden min-\[1700px\]:inline">\{t\.importTitle\}/);
  });

  it('keeps the switch in the flow, so it can never land on the tabs', () => {
    const header = app.slice(app.indexOf('<header'), app.indexOf('</header>'));

    expect(header).not.toMatch(/absolute/);
    expect(header).toMatch(/flex-wrap/);
    expect(header).toMatch(/switchCentered \? 'topbar-switch-centered' : ''/);
  });

  it('gives the three views the same width, which is what puts the middle one in the middle', () => {
    const header = app.slice(app.indexOf('<header'), app.indexOf('</header>'));
    
    expect(header).toMatch(/grid-cols-3 items-center/);
    
    const [, viewButton] = /<button[\s\S]*?className=\{`([^`]*)`\}/.exec(header).slice(0, 2) || [];
    expect(viewButton).toMatch(/justify-center/);
    expect(viewButton).toMatch(/whitespace-nowrap/);
  });

  it('lets the bar grow a second row instead of clipping on narrow screens', () => {
    const header = app.slice(app.indexOf('<header'), app.indexOf('</header>'));
    expect(header).toMatch(/min-h-14/);
    expect(header).toMatch(/flex-wrap/);

    const sidebar = [...css.matchAll(/^\.app-sidebar \{([^}]*)\}/gm)].map((m) => m[1]);
    expect(sidebar.some((body) => body.includes('width: var(--app-sidebar-width)'))).toBe(true);
    const root = css.slice(css.indexOf(':root'), css.indexOf('}', css.indexOf(':root')));
    expect(root).toMatch(/--app-sidebar-width:\s*20rem/);
  });

  it('centres the switch on the panes only through the measured class', () => {
    const [rule] = [...css.matchAll(/^\.topbar-switch-centered \{([^}]*)\}/gm)].map((m) => m[1]);
    expect(rule, 'missing .topbar-switch-centered rule').toBeTruthy();
    expect(rule).toMatch(/position:\s*absolute/);
    expect(rule).toMatch(/left:\s*calc\(50% - var\(--app-sidebar-width\) \/ 2\)/);
    expect(rule).toMatch(/transform:\s*translate\(-50%, -50%\)/);
  });

  it('centres the switch like before past laptop widths', () => {
    const at = css.indexOf('@media (min-width: 1700px)');
    expect(at, 'missing the big-screen media query').toBeGreaterThan(-1);
    const block = css.slice(at, at + 600);
    expect(block).toContain('.topbar-switch');
    expect(block).toMatch(/position:\s*absolute/);
    expect(block).toMatch(/left:\s*calc\(50% - var\(--app-sidebar-width\) \/ 2\)/);
  });
});
