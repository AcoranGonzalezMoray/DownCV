import { describe, it, expect } from 'vitest';
import { insideSkillsSection, partialWordAt, skillsInUse, suggestSkills } from '../../src/utils/skillSuggestions';

describe('suggestSkills', () => {
  it('completes the fragment a person actually types', () => {
    expect(suggestSkills('Kube').map((entry) => entry.name)).toContain('Kubernetes');
    expect(suggestSkills('Postg').map((entry) => entry.name)).toContain('PostgreSQL');
    expect(suggestSkills('k8s').map((entry) => entry.name)).toContain('Kubernetes');
  });

  it('ignores accents and case on both sides', () => {
    expect(suggestSkills('postgre').map((entry) => entry.name)).toContain('PostgreSQL');
    expect(suggestSkills('JAVASCRIPT')[0].name).toBe('JavaScript');
  });

  it('puts the exact word first, then the shorter alias, then the longer names', () => {
    const names = suggestSkills('react', { limit: 5 }).map((entry) => entry.name);
    expect(names[0]).toBe('React');
    expect(names).toContain('React Native');
    expect(names.indexOf('React')).toBeLessThan(names.indexOf('React Native'));
  });

  it('never offers a technology the CV already lists', () => {
    const withReact = suggestSkills('react', { exclude: ['React', 'React Native'] });
    expect(withReact.map((entry) => entry.name)).not.toContain('React');
  });

  it('says nothing for an empty fragment, so the list is not a wall of names', () => {
    expect(suggestSkills('')).toEqual([]);
    expect(suggestSkills('   ')).toEqual([]);
    expect(suggestSkills('zzzz')).toEqual([]);
  });

  it('respects the limit and never repeats a name', () => {
    const names = suggestSkills('a', { limit: 5 }).map((entry) => entry.name);
    expect(names.length).toBeLessThanOrEqual(5);
    expect(new Set(names).size).toBe(names.length);
  });

  it('brings the group along, so the list can be sorted by it', () => {
    expect(suggestSkills('kube')[0]).toMatchObject({ name: 'Kubernetes', group: 'Tooling' });
  });
});

describe('partialWordAt', () => {
  const MD = '- React, Kube';

  it('reads the word under the caret and where it starts', () => {
    expect(partialWordAt(MD, MD.length)).toEqual({ word: 'Kube', start: 9, end: 13 });
    expect(partialWordAt(MD, 7)).toEqual({ word: 'React', start: 2, end: 7 });
  });

  it('reads nothing after a separator, which is how a finished word is left alone', () => {
    expect(partialWordAt('React, ', 7).word).toBe('');
    expect(partialWordAt('React\nVue', 9).word).toBe('Vue');
  });

  it('survives a caret past the end of the document', () => {
    expect(partialWordAt('abc', 99).word).toBe('abc');
  });
});

describe('insideSkillsSection', () => {
  const CV = '## SKILLS\n\nReact, Kube\n\n## EXPERIENCE\n\n- Led things';

  it('offers technologies only inside the skills block', () => {
    expect(insideSkillsSection(CV, CV.indexOf('Kube'))).toBe(true);
    expect(insideSkillsSection(CV, CV.indexOf('Led things'))).toBe(false);
  });

  it('reads the section heading in either language', () => {
    expect(insideSkillsSection('## Habilidades\n\nKube', 20)).toBe(true);
    expect(insideSkillsSection('## Tech Stack\n\nKube', 19)).toBe(true);
  });

  it('offers nothing before any heading, and nothing for a CV that is a list of skills', () => {
    expect(insideSkillsSection('React, Kube', 10)).toBe(false);
    expect(insideSkillsSection('', 0)).toBe(false);
  });
});

describe('skillsInUse', () => {
  it('finds the technologies the CV already claims, however they are capitalised', () => {
    const found = skillsInUse('## Skills\n\nreact, POSTGRESQL, docker');
    expect(found).toEqual(expect.arrayContaining(['React', 'PostgreSQL', 'Docker']));
  });

  it('does not match a technology hidden inside a longer word', () => {
    expect(skillsInUse('## Skills\n\nReactive streams')).not.toContain('React');
  });
});
