import { describe, it, expect } from 'vitest';
import { enhanceBulletPoint, generateExecutiveSummary } from '../../src/utils/aiEnhancer';

describe('aiEnhancer', () => {
  it('identifies weak verbs and suggests impactful active alternatives with metrics', () => {
    const weakBullet = 'Worked on migration of database';
    const result = enhanceBulletPoint(weakBullet, 'en');

    expect(result.suggestions.length).toBeGreaterThan(0);
    expect(result.suggestions[0]).toMatch(
      /^(?:Spearheaded|Architected|Engineered|Orchestrated|Designed|Streamlined)/,
    );
    expect(result.suggestions[0]).toContain('improving performance');
  });

  it('supports Spanish phrasing and weak verb transformations', () => {
    const weakBullet = 'Trabajé en el desarrollo de la API';
    const result = enhanceBulletPoint(weakBullet, 'es');

    expect(result.suggestions.length).toBeGreaterThan(0);
    expect(result.suggestions[0]).toMatch(
      /^(?:Lideró|Arquitectó|Optimizó|Diseñó|Implementó|Orquestó)/,
    );
    expect(result.suggestions[0]).toContain('mejorando el rendimiento');
  });

  it('generates a tailored professional executive summary from CV text', () => {
    const cv = `
      # John Doe
      **Full Stack Developer**
      john@example.com
      ### Skills
      - **Tech**: React, Node.js, PostgreSQL, Docker
    `;

    const summaryEn = generateExecutiveSummary(cv, 'en');
    expect(summaryEn).toContain('Full Stack Developer');
    expect(summaryEn).toContain('React');

    const summaryEs = generateExecutiveSummary(cv, 'es');
    expect(summaryEs).toContain('Full Stack Developer');
    expect(summaryEs).toContain('trayectoria técnica');
  });
});
