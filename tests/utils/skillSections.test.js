import { describe, it, expect } from 'vitest';
import { suggestSkills } from '../../src/utils/skillSuggestions';

const SPANISH_CV = `## TECHNICAL SKILLS
- **Languages:** Java, JavaScript, TypeScript, SQL, HTML, CSS, C#, Rust, Python, PHP
- **Frameworks:** .NET, ASP.NET, Symfony, Ionic, Firebase, React Native, Nextjs, Angular
- **Bases de datos:** MySQL, PostgreSQL, Neo4j, Oracle, SQLite, SQL Server
- **Tecnologías / Herramientas:** Docker, Jenkins, RabbitMQ, SonarQube, Maven, Git, Podman, Argo CD, OpenTofu, OpenTelemetry + Grafana
- **Prácticas:** Agile, Scrum, SOLID Principles, TDD, Code Reviews, DDD, BDD, XP, Event Sourcing, CQRS, Observability, Feature Management, Clean Architecture, SDD, REST API
`;

const ENGLISH_CV = `# Ana

## Skills

- **Languages:** JavaScript (ES6+), TypeScript, Python, SQL, HTML5, CSS3.
- **Frontend:** React, Next.js, Redux Toolkit, Tailwind CSS, Webpack, HTML/CSS.
- **Backend:** Node.js, Express, NestJS, Python (FastAPI, Django), REST APIs, GraphQL.
- **Databases & Cloud:** PostgreSQL, MongoDB, Redis, AWS (S3, ECS, Lambda), Docker, Kubernetes.
- **Tools & DevOps:** Git, GitHub Actions, CI/CD, Jest, Cypress, Datadog, dock
`;

function namedIn(line) {
  return line
    .replace(/^- \*\*.+?:\*\*\s*/, '')
    .split(/[,.]/)
    .map((entry) => entry.trim())
    .filter(Boolean);
}

const lines = (cv) => cv.split('\n').filter((line) => line.startsWith('- '));

describe('a skills section as candidates really write it', () => {
  it('offers the technologies a Spanish section is missing, not the ones it has', () => {
    const already = new Set(lines(SPANISH_CV).flatMap(namedIn));

    const wanted = [
      'GraphQL',
      'MongoDB',
      'Redis',
      'AWS',
      'Kubernetes',
      'GitHub Actions',
      'Jest',
      'Cypress',
      'Datadog',
      'Docker',
      'React',
      'Vue',
      'Laravel',
      'Kotlin',
      'Rust',
    ];
    wanted.forEach((name) => {
      const known = suggestSkills(name, { limit: 12 }).some(
        (entry) => entry.name.toLowerCase() === name.toLowerCase(),
      );
      expect(known, `${name} is not in the vocabulary`).toBe(true);
    });

    const offered = suggestSkills('Postgre', { exclude: [...already] }).map((entry) => entry.name);
    expect(offered).not.toContain('PostgreSQL');
  });

  it('offers the technologies an English section is missing', () => {
    const already = new Set(lines(ENGLISH_CV).flatMap(namedIn));
    [
      'Tailwind CSS',
      'Webpack',
      'Redux',
      'FastAPI',
      'Django',
      'GraphQL',
      'AWS',
      'S3',
      'ECS',
      'Lambda',
      'Kubernetes',
      'GitHub Actions',
      'CI/CD',
      'Jest',
      'Cypress',
      'Datadog',
      'PostgreSQL',
      'MongoDB',
      'Redis',
      'Express',
      'NestJS',
      'Node.js',
    ].forEach((name) => {
      const known = suggestSkills(name, { limit: 12 }).some(
        (entry) => entry.name.toLowerCase() === name.toLowerCase(),
      );
      expect(known, `${name} is not in the vocabulary`).toBe(true);
    });
    expect(suggestSkills('Postg', { exclude: [...already] }).map((e) => e.name)).not.toContain(
      'PostgreSQL',
    );
  });

  it('completes the half typed fragments those sections are written with', () => {

    const fragments = {
      Kube: 'Kubernetes',
      Postg: 'PostgreSQL',
      Graph: 'GraphQL',
      Nest: 'NestJS',
      Nextj: 'Next.js',
      Tailw: 'Tailwind CSS',
      'GitHub A': 'GitHub Actions',
      Tofu: 'OpenTofu',
      OpenT: 'OpenTelemetry',
      'Argo ': 'Argo CD',
      Sonar: 'SonarQube',
      Dock: 'Docker',
      Nexus: 'Nexus',
    };
    Object.entries(fragments).forEach(([typed, expected]) => {
      expect(
        suggestSkills(typed, { limit: 10 }).map((entry) => entry.name),
        `typing ${typed}`,
      ).toContain(expected);
    });
  });
});
