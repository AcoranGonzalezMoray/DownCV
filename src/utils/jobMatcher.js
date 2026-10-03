const COMMON_SKILLS = [
  'javascript',
  'typescript',
  'python',
  'java',
  'c++',
  'c#',
  'golang',
  'go',
  'rust',
  'ruby',
  'php',
  'swift',
  'kotlin',
  'react',
  'react.js',
  'vue',
  'vue.js',
  'angular',
  'svelte',
  'next.js',
  'nuxt',
  'node',
  'node.js',
  'express',
  'nestjs',
  'django',
  'fastapi',
  'flask',
  'spring',
  'spring boot',
  'rails',
  'html',
  'html5',
  'css',
  'css3',
  'sass',
  'tailwind',
  'tailwindcss',
  'bootstrap',
  'sql',
  'mysql',
  'postgresql',
  'postgres',
  'sqlite',
  'mongodb',
  'redis',
  'elasticsearch',
  'dynamodb',
  'cassandra',
  'oracle',
  'aws',
  'amazon web services',
  'azure',
  'gcp',
  'google cloud',
  'docker',
  'kubernetes',
  'k8s',
  'terraform',
  'ansible',
  'jenkins',
  'gitlab',
  'github actions',
  'ci/cd',
  'linux',
  'unix',
  'bash',
  'shell',
  'git',
  'rest',
  'restful',
  'graphql',
  'grpc',
  'microservices',
  'serverless',
  'kafka',
  'rabbitmq',
  'agile',
  'scrum',
  'kanban',
  'jira',
  'confluence',
  'tdd',
  'unit testing',
  'jest',
  'vitest',
  'cypress',
  'playwright',
  'devops',
  'machine learning',
  'ai',
  'data science',
  'deep learning',
  'nlp',
  'llm',
  'figma',
  'ux',
  'ui',
];

const STOP_WORDS = new Set([
  'and',
  'the',
  'for',
  'with',
  'you',
  'will',
  'are',
  'our',
  'team',
  'work',
  'have',
  'from',
  'this',
  'that',
  'your',
  'about',
  'more',
  'what',
  'join',
  'role',
  'responsibilities',
  'qualifications',
  'requirements',
  'experience',
  'years',
  'working',
  'ability',
  'must',
  'skills',
  'strong',
  'candidate',
  'position',
  'company',
  'que',
  'los',
  'las',
  'por',
  'para',
  'con',
  'una',
  'del',
  'los',
  'este',
  'esta',
  'como',
  'sobre',
  'todo',
  'anos',
  'años',
  'mas',
  'más',
  'experiencia',
  'trabajo',
  'equipo',
  'requisitos',
  'funciones',
  'puesto',
]);

export function extractJobKeywords(text = '') {
  if (!text || typeof text !== 'string') {
    return [];
  }
  const normalized = text.toLowerCase();
  const found = new Set();

  COMMON_SKILLS.forEach((skill) => {
    const escaped = skill.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`(?:^|[\\s,;:.()\\[\\]/])${escaped}(?=[\\s,;:.()\\[\\]/]|$)`, 'i');
    if (regex.test(normalized)) {
      found.add(skill);
    }
  });

  const acronyms = text.match(/\b[A-Z]{2,6}(?:\/[A-Z]{2,6})?\b/g) || [];
  acronyms.forEach((ac) => {
    const clean = ac.toLowerCase();
    if (!STOP_WORDS.has(clean) && clean.length >= 2) {
      found.add(clean);
    }
  });

  const words = normalized.match(/[a-z0-9#+.-]{3,20}/g) || [];
  const frequency = {};
  words.forEach((w) => {
    if (!STOP_WORDS.has(w) && !/^\d+$/.test(w)) {
      frequency[w] = (frequency[w] || 0) + 1;
    }
  });

  Object.entries(frequency)
    .filter(([word, count]) => count >= 2 && word.length >= 4)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .forEach(([w]) => found.add(w));

  return Array.from(found).sort();
}

export function matchJobDescription(jobDescription, cvText, options = {}) {
  const { targetLevel = 'mid', lang = 'en' } = options;
  const keywords = extractJobKeywords(jobDescription);
  if (keywords.length === 0) {
    return {
      score: 0,
      totalKeywords: 0,
      matchedKeywords: [],
      missingKeywords: [],
      recommendations: [
        lang === 'es'
          ? 'Pega una descripción de puesto detallada para analizar compatibilidad.'
          : 'Paste a detailed job description to analyze match rate.',
      ],
    };
  }

  const cvLower = String(cvText || '').toLowerCase();
  const matched = [];
  const missing = [];

  keywords.forEach((kw) => {
    const escaped = kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`(?:^|[\\s,;:.()\\[\\]/])${escaped}(?=[\\s,;:.()\\[\\]/]|$)`, 'i');
    if (regex.test(cvLower)) {
      matched.push(kw);
    } else {
      missing.push(kw);
    }
  });

  const rawScore = (matched.length / keywords.length) * 100;
  const score = Math.round(rawScore);

  const recommendations = [];

  if (missing.length > 0) {
    const topMissing = missing.slice(0, 5).join(', ');
    if (lang === 'es') {
      recommendations.push(
        `Añade palabras clave críticas faltantes en tus secciones de Habilidades o Experiencia: ${topMissing}.`,
      );
    } else {
      recommendations.push(
        `Incorporate critical missing keywords into your Skills or Experience section: ${topMissing}.`,
      );
    }
  }

  if (targetLevel === 'junior') {
    if (lang === 'es') {
      recommendations.push(
        'Para perfiles Junior: mantén el CV en 1 página y resalta proyectos prácticos y tecnologías base.',
      );
    } else {
      recommendations.push(
        'For Junior roles: maintain a 1-page resume and emphasize practical projects and core technologies.',
      );
    }
  } else if (targetLevel === 'mid') {
    if (lang === 'es') {
      recommendations.push(
        'Para perfiles Mid/Senior: cuantifica el impacto de estas tecnologías con métricas concretas (% o cifras).',
      );
    } else {
      recommendations.push(
        'For Mid/Senior roles: quantify your technical impact with measurable metrics (% improvement, scale).',
      );
    }
  } else if (targetLevel === 'executive') {
    if (lang === 'es') {
      recommendations.push(
        'Para perfiles Executive/Lead: complementa las habilidades con impacto en negocio, liderazgo y presupuestos.',
      );
    } else {
      recommendations.push(
        'For Executive/Lead roles: emphasize strategic vision, team leadership, budget scale, and business ROI.',
      );
    }
  }

  return {
    score,
    totalKeywords: keywords.length,
    matchedKeywords: matched,
    missingKeywords: missing,
    recommendations,
  };
}
