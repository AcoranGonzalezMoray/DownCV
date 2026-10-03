import { describe, it, expect, vi } from 'vitest';
import { generatePortfolioHtml, exportToPortfolioHtml } from '../../src/utils/portfolioExport';

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
});
