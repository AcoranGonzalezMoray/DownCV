import { describe, it, expect } from 'vitest';
import { KNOWN_SKILLS, partialWordAt, skillsInUse, suggestSkills } from '../../src/utils/skillSuggestions';

describe('the vocabulary', () => {
  it('knows the platforms and tools a posting asks for by name', () => {
    const expected = [
      'Java',
      'C#',
      'Rust',
      'Python',
      'PHP',
      'SQL',
      'HTML',
      'CSS',
      '.NET',
      'ASP.NET',
      'Symfony',
      'Ionic',
      'Firebase',
      'React Native',
      'Next.js',
      'Angular',
      'MySQL',
      'PostgreSQL',
      'Neo4j',
      'Oracle DB',
      'SQLite',
      'SQL Server',
      'Docker',
      'Jenkins',
      'RabbitMQ',
      'SonarQube',
      'Maven',
      'Git',
      'Podman',
      'Argo CD',
      'OpenTofu',
      'OpenTelemetry',
      'Grafana',
      'Terraform',
      'Kubernetes',
    ];
    expected.forEach((name) => expect(KNOWN_SKILLS, `missing ${name}`).toContain(name));
  });

  it('knows the practices, which are half of what a section of skills says', () => {
    const expected = [
      'Agile',
      'Scrum',
      'SOLID Principles',
      'TDD',
      'BDD',
      'DDD',
      'SDD',
      'XP',
      'Code Review',
      'Event Sourcing',
      'CQRS',
      'Observability',
      'Feature Flags',
      'Clean Architecture',
      'REST API',
      'DevOps',
    ];
    expected.forEach((name) => expect(KNOWN_SKILLS, `missing ${name}`).toContain(name));
  });

  it('offers an acronym as itself as well as spelled out', () => {
    
    expect(suggestSkills('TDD').map((entry) => entry.name)).toEqual(
      expect.arrayContaining(['TDD', 'Test Driven Development']),
    );
    expect(suggestSkills('ddd')[0].name).toBe('DDD');
  });

  it('never lists a name twice, however many aliases reach it', () => {
    const names = KNOWN_SKILLS;
    expect(new Set(names).size).toBe(names.length);
  });

  it('is big enough to be worth opening for, and not a wall', () => {
    expect(KNOWN_SKILLS.length).toBeGreaterThan(350);
    expect(suggestSkills('a', { limit: 8 })).toHaveLength(8);
  });
});

describe('the words of a skills line', () => {
  it('reads one technology at a time out of a slash separated pair', () => {
    const line = '- **Frontend:** HTML/CSS, ';
    expect(partialWordAt(line, line.length).word).toBe('');
    expect(partialWordAt(`${line}HTML`, line.length + 4).word).toBe('HTML');
    expect(partialWordAt(`${line}HTML/`, line.length + 5).word).toBe('');
    expect(partialWordAt(`${line}HTML/CSS`, line.length + 8).word).toBe('CSS');
  });

  it('reads a technology out from under a bold label', () => {
    const line = '- **Backend:** Node.js, ';
    expect(partialWordAt(`${line}Nest`, line.length + 4).word).toBe('Nest');
  });

  it('keeps reading the dot, so Node.js is one word and not two', () => {
    const line = '- **Backend:** Node.j';
    expect(partialWordAt(line, line.length).word).toBe('Node.j');
  });

  it('stops at a colon, which ends a label', () => {
    expect(partialWordAt('Languages: Pyth', 15).word).toBe('Pyth');
  });
});

describe('what the CV already claims', () => {
  it('is found whatever the capitalisation, for anything long enough to have one', () => {
    const found = skillsInUse('## Skills\n\nreact, POSTGRESQL, docker');
    expect(found).toEqual(expect.arrayContaining(['React', 'PostgreSQL', 'Docker']));
  });

  it('is not found by accident for a short name, which would hide the technology', () => {
    
    expect(skillsInUse('Started at 5pm with a bit of xp')).not.toContain('PM');
    expect(skillsInUse('Started at 5pm with a bit of xp')).not.toContain('XP');

    expect(skillsInUse('Languages: Go, C, R, XP')).toEqual(
      expect.arrayContaining(['Go', 'C', 'R', 'XP']),
    );
  });

  it('still refuses a technology hidden inside a longer word', () => {
    expect(skillsInUse('## Skills\n\nReactive streams')).not.toContain('React');
  });
});
