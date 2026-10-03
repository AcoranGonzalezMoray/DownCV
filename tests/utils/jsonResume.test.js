import { describe, it, expect } from 'vitest';
import { jsonResumeToMarkdown, markdownToJsonResume } from '../../src/utils/jsonResume';

const sampleJsonResume = {
  basics: {
    name: 'Alex Morgan',
    label: 'Senior Cloud Architect',
    email: 'alex@example.com',
    phone: '+1-555-0199',
    url: 'https://alex.dev',
    summary:
      'Experienced cloud architect with 10+ years specializing in AWS and distributed systems.',
    location: {
      city: 'San Francisco',
      countryCode: 'US',
    },
    profiles: [{ network: 'LinkedIn', url: 'https://linkedin.com/in/alexmorgan' }],
  },
  work: [
    {
      name: 'CloudScale Inc',
      position: 'Lead Architect',
      startDate: '2021',
      endDate: 'Present',
      summary: 'Leading infrastructure scalability initiatives.',
      highlights: [
        'Architected multi-region Kubernetes cluster cutting failover time by 80%',
        'Mentored team of 12 cloud engineers',
      ],
    },
  ],
  education: [
    {
      institution: 'Stanford University',
      area: 'Computer Science',
      studyType: 'B.S.',
      startDate: '2015',
      endDate: '2019',
    },
  ],
  skills: [
    {
      name: 'Cloud & DevOps',
      keywords: ['AWS', 'Kubernetes', 'Terraform', 'Docker'],
    },
  ],
  certificates: [
    {
      name: 'AWS Certified Solutions Architect - Professional',
      issuer: 'Amazon Web Services',
      date: '2023',
    },
  ],
};

describe('jsonResume converter', () => {
  it('converts json resume into clean DownCV markdown', () => {
    const md = jsonResumeToMarkdown(sampleJsonResume);
    expect(md).toContain('# Alex Morgan');
    expect(md).toContain('**Senior Cloud Architect**');
    expect(md).toContain('alex@example.com');
    expect(md).toContain('San Francisco, US');
    expect(md).toContain('### Professional Summary');
    expect(md).toContain('### Work Experience');
    expect(md).toContain('#### Lead Architect - CloudScale Inc | 2021 - Present');
    expect(md).toContain(
      '- Architected multi-region Kubernetes cluster cutting failover time by 80%',
    );
    expect(md).toContain('### Education');
    expect(md).toContain('B.S. in Computer Science - Stanford University');
    expect(md).toContain('### Skills');
    expect(md).toContain('- **Cloud & DevOps**: AWS, Kubernetes, Terraform, Docker');
    expect(md).toContain('### Certifications');
    expect(md).toContain(
      'AWS Certified Solutions Architect - Professional - Amazon Web Services (2023)',
    );
  });

  it('converts DownCV markdown back into a valid JSON resume schema structure', () => {
    const md = jsonResumeToMarkdown(sampleJsonResume);
    const resume = markdownToJsonResume(md);

    expect(resume.basics.name).toBe('Alex Morgan');
    expect(resume.basics.label).toBe('Senior Cloud Architect');
    expect(resume.basics.email).toBe('alex@example.com');
    expect(resume.work.length).toBeGreaterThan(0);
    expect(resume.work[0].highlights.length).toBe(2);
    expect(resume.work[0].highlights[0]).toContain('Architected multi-region Kubernetes');
    expect(resume.skills.length).toBeGreaterThan(0);
  });

  it('handles empty or minimal input safely without crashing', () => {
    const emptyMd = markdownToJsonResume('');
    expect(emptyMd.basics.name).toBe('');
    expect(emptyMd.work).toEqual([]);

    expect(() => jsonResumeToMarkdown(null)).toThrow('invalid-json');
    const minimalMd = jsonResumeToMarkdown({});
    expect(minimalMd).toBe('');
  });
});
