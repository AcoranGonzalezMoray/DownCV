import { describe, it, expect, vi } from 'vitest';
import {
  generatePortfolioHtml,
  exportToPortfolioHtml,
  inlineHtml,
} from '../../src/utils/portfolioExport';

const sampleCV = `
# Alex Rivera
**Lead Software Engineer**
alex@example.com | San Francisco, CA | https://alex.dev

### Professional Summary
Experienced engineering leader with expertise in high-scale systems.

### Experience
#### Senior Architect - TechCorp | 2021 - Present
- Led modernization of payment processing pipeline
- Improved throughput by 40%

### Skills
- **Core**: TypeScript, React, Go, Docker, Kubernetes
`;

describe('portfolioExport', () => {
  it('generates a complete standalone HTML document with hero and sections', () => {
    const html = generatePortfolioHtml(sampleCV);
    expect(html).toContain('<!DOCTYPE html>');
    expect(html).toContain('Alex Rivera');
    expect(html).toContain('Lead Software Engineer');
    expect(html).toContain('alex@example.com');
    expect(html).toContain('TechCorp');
    expect(html).toContain('TypeScript');
    expect(html).toContain('DownCV');
  });

  it('triggers file download correctly with blob', () => {
    global.URL.createObjectURL = vi.fn(() => 'blob:test-html');
    global.URL.revokeObjectURL = vi.fn();

    const success = exportToPortfolioHtml(sampleCV);
    expect(success).toBe(true);
    expect(global.URL.createObjectURL).toHaveBeenCalled();
  });

  it('renders the Markdown inline syntax as HTML, so no ** ever reaches the file', () => {
    const cv = `# Ana\n\n**Senior Backend Developer** | *Mar 2019 - Dec 2021*\n\n### Innova Software Lab\n- Built high performance REST and GraphQL APIs in **Node.js (Express/NestJS)** serving more than **2 million requests a day**.\n- Optimised queries in \`PostgreSQL\` and saw [the site](https://example.dev) grow.\n`;

    const html = generatePortfolioHtml(cv);

    expect(html).not.toContain('**');
    expect(html).toContain('<strong class="font-semibold text-white">Node.js (Express/NestJS)</strong>');
    expect(html).toContain('<em>Mar 2019 - Dec 2021</em>');
    expect(html).toContain('<code class="rounded bg-slate-900');
    expect(html).toContain('<a href="https://example.dev"');
  });

  it('escapes the text instead of trusting it', () => {
    expect(inlineHtml('<script>alert(1)</script>')).not.toContain('<script>');
    expect(inlineHtml('a & b')).toContain('&amp;');
  });

  it('never ships a raw <br>, a lone ** or a non-ASCII byte in the file', () => {
    const cv = `# Ana Gómez\n\n**Backend Engineer** | *Remote*\n\n### ACERCA DE\n<br>\n**Languages:** Spanish (native), English (C1)\n\n- Built APIs in **Node.js**\n<br>\n### EXPERIENCIA\n#### Acme\n**Stack:** Go, Postgres\n<br>\n`;

    const html = generatePortfolioHtml(cv);

    expect(html).not.toMatch(/<br\s*\/?>/i);
    expect(html).not.toContain('**');
    expect(html).toContain('<strong class="font-semibold text-white">Stack:</strong>');
    expect(html).toContain('<strong class="font-semibold text-white">Languages:</strong>');
    expect(html).toContain('Ana G&#243;mez');
    expect(html).toMatch(/^[\x00-\x7f]*$/);
  });
});
