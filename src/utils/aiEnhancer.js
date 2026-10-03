const WEAK_VERBS_EN = [
  {
    weak: /\b(?:worked on|responsible for|helped with|assisted with|handled|did|participated in)\b/i,
    replacements: [
      'Spearheaded',
      'Architected',
      'Engineered',
      'Orchestrated',
      'Designed',
      'Streamlined',
    ],
  },
  {
    weak: /\b(?:made|created|built)\b/i,
    replacements: ['Pioneered', 'Developed', 'Engineered', 'Instituted', 'Constructed'],
  },
  {
    weak: /\b(?:changed|fixed|updated)\b/i,
    replacements: ['Overhauled', 'Refactored', 'Optimized', 'Modernized', 'Remediated'],
  },
  {
    weak: /\b(?:managed|led)\b/i,
    replacements: ['Directed', 'Orchestrated', 'Spearheaded', 'Guided', 'Mobilized'],
  },
];

const WEAK_VERBS_ES = [
  {
    weak: /\b(?:trabaj[eé] en|responsable de|ayud[eé] con|asist[ií] en|hice|particip[eé] en)\b/i,
    replacements: ['Lideró', 'Arquitectó', 'Optimizó', 'Diseñó', 'Implementó', 'Orquestó'],
  },
  {
    weak: /\b(?:hizo|cre[eé]|constru[ií])\b/i,
    replacements: ['Pionero en desarrollar', 'Ingenió', 'Diseñó', 'Instituyó'],
  },
  {
    weak: /\b(?:arregl[eé]|cambi[eé]|actualic[eé])\b/i,
    replacements: ['Refactorizó', 'Optimizó', 'Modernizó', 'Reestructuró'],
  },
  {
    weak: /\b(?:gestion[eé]|lider[eé])\b/i,
    replacements: ['Dirigió', 'Orquestó', 'Encabezó', 'Supervisó'],
  },
];

export function enhanceBulletPoint(bullet = '', lang = 'en') {
  const clean = bullet.replace(/^[-*•]\s*/, '').trim();
  if (!clean) {
    return { original: bullet, suggestions: [], hasMetrics: false };
  }

  const hasMetrics =
    /\d+%|\$\d+|\b\d+\s*(?:users|clients|ms|seconds|hours|team members|deploys|pedidos|usuarios|clientes|días|horas)\b/i.test(
      clean,
    );
  const rules = lang === 'es' ? WEAK_VERBS_ES : WEAK_VERBS_EN;
  const suggestions = [];

  let verbReplaced = false;
  rules.forEach(({ weak, replacements }) => {
    if (weak.test(clean)) {
      replacements.slice(0, 3).forEach((strongVerb) => {
        let enhanced = clean.replace(weak, strongVerb);

        enhanced = enhanced.charAt(0).toUpperCase() + enhanced.slice(1);
        if (!hasMetrics) {
          const metricHint =
            lang === 'es'
              ? ' (mejorando el rendimiento en un 25%)'
              : ' (improving performance by 25%)';
          enhanced += metricHint;
        }
        suggestions.push(enhanced);
      });
      verbReplaced = true;
    }
  });

  if (!verbReplaced && !hasMetrics) {
    const metricHint =
      lang === 'es'
        ? ', logrando una reducción de tiempos del 30%'
        : ', resulting in a 30% reduction in turnaround time';
    suggestions.push(clean + metricHint);
  }

  return {
    original: clean,
    suggestions: suggestions.slice(0, 3),
    hasMetrics,
  };
}

export function generateExecutiveSummary(markdown = '', lang = 'en') {
  const text = String(markdown || '');
  const lines = text.split('\n');

  let title = '';
  const skills = [];
  const roles = [];

  lines.forEach((line) => {
    const trimmed = line.trim();
    if (trimmed.startsWith('**') && trimmed.endsWith('**') && !title) {
      title = trimmed.replace(/^\*\*|\*\*$/g, '').trim();
    } else if (trimmed.startsWith('####')) {
      roles.push(
        trimmed
          .replace(/^####\s+/, '')
          .split('|')[0]
          .trim(),
      );
    } else if (trimmed.startsWith('- **') && trimmed.includes(':')) {
      const items = trimmed.split(':')[1];
      if (items) {
        items.split(',').forEach((s) => skills.push(s.trim()));
      }
    }
  });

  const topSkills = skills.slice(0, 4).join(', ');
  const primaryRole =
    title || roles[0] || (lang === 'es' ? 'Profesional de Tecnología' : 'Technology Professional');

  if (lang === 'es') {
    return `${primaryRole} con sólida trayectoria técnica y experiencia contrastada en ${topSkills || 'gestión y desarrollo'}. Especialista en diseñar soluciones escalables, optimizar flujos de trabajo e impulsar resultados de negocio medibles en entornos colaborativos y de alto rendimiento.`;
  }

  return `Results-driven ${primaryRole} with a strong track record of success and proven expertise in ${topSkills || 'system architecture and development'}. Adept at designing scalable solutions, optimizing team workflows, and delivering measurable business impact in fast-paced environments.`;
}

export async function callAIEndpoint({
  prompt,
  systemPrompt,
  endpoint = 'http://localhost:11434/v1/chat/completions',
  apiKey = '',
  model = 'llama3',
}) {
  const res = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
    },
    body: JSON.stringify({
      model,
      messages: [
        {
          role: 'system',
          content: systemPrompt || 'You are an expert ATS resume writer and career coach.',
        },
        { role: 'user', content: prompt },
      ],
      temperature: 0.7,
    }),
  });

  if (!res.ok) {
    throw new Error(`AI endpoint returned ${res.status}: ${res.statusText}`);
  }

  const data = await res.json();
  return data?.choices?.[0]?.message?.content || '';
}
