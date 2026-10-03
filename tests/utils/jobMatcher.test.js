import { describe, it, expect } from 'vitest';
import { extractJobKeywords, matchJobDescription } from '../../src/utils/jobMatcher';

describe('jobMatcher', () => {
  const sampleJob = `
    We are looking for a Senior Frontend Engineer with deep experience in React, TypeScript, and TailwindCSS.
    Requirements:
    - 5+ years with JavaScript, React, and Next.js
    - Experience with Docker and CI/CD pipelines
    - Familiarity with AWS and GraphQL
  `;

  const sampleCV = `
    # Jane Doe
    jane@example.com
    ### Experience
    Senior Developer with React, TypeScript and Docker.
    Built CI/CD automated deployment workflows.
    ### Skills
    - React, TypeScript, Docker, Git, REST APIs
  `;

  it('extracts technical skills and acronyms accurately', () => {
    const kws = extractJobKeywords(sampleJob);
    expect(kws).toContain('react');
    expect(kws).toContain('typescript');
    expect(kws).toContain('docker');
    expect(kws).toContain('ci/cd');
    expect(kws).toContain('aws');
  });

  it('matches resume against job description and flags missing keywords', () => {
    const result = matchJobDescription(sampleJob, sampleCV, { targetLevel: 'mid', lang: 'en' });
    expect(result.score).toBeGreaterThan(40);
    expect(result.matchedKeywords).toContain('react');
    expect(result.matchedKeywords).toContain('typescript');
    expect(result.matchedKeywords).toContain('docker');
    expect(result.missingKeywords).toContain('aws');
    expect(result.recommendations.length).toBeGreaterThan(0);
  });

  it('adapts recommendations to selected target level', () => {
    const junior = matchJobDescription(sampleJob, sampleCV, { targetLevel: 'junior', lang: 'es' });
    expect(junior.recommendations.some((r) => r.includes('Junior'))).toBe(true);

    const exec = matchJobDescription(sampleJob, sampleCV, { targetLevel: 'executive', lang: 'en' });
    expect(exec.recommendations.some((r) => r.includes('Executive'))).toBe(true);
  });

  it('handles empty input gracefully', () => {
    const empty = matchJobDescription('', '');
    expect(empty.score).toBe(0);
    expect(empty.totalKeywords).toBe(0);
  });
});
