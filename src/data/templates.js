export const LAYOUT_TEMPLATES = [
  {
    id: 'ats-classic',
    family: 'sans',
    density: 0.6,
    styles: {
      fontFamily: "'Roboto', sans-serif",
      fontSize: 13,
      lineHeight: 1.45,
      primaryColor: '#1e293b',
      borderStyle: 'line',
      bulletStyle: '•',
      marginY: 24,
      marginX: 28,
      sectionGap: 14,
    },
  },
  {
    id: 'modern-executive',
    family: 'sans',
    density: 0.55,
    styles: {
      fontFamily: "'Outfit', sans-serif",
      fontSize: 13.5,
      lineHeight: 1.5,
      primaryColor: '#0f172a',
      borderStyle: 'thick-left',
      bulletStyle: '▸',
      marginY: 26,
      marginX: 30,
      sectionGap: 18,
    },
  },
  {
    id: 'technical-compact',
    family: 'sans',
    density: 0.8,
    styles: {
      fontFamily: "'Inter', sans-serif",
      fontSize: 12,
      lineHeight: 1.38,
      primaryColor: '#1e40af',
      borderStyle: 'minimal',
      bulletStyle: '-',
      marginY: 20,
      marginX: 22,
      sectionGap: 12,
    },
  },
  {
    id: 'elegant-serif',
    family: 'serif',
    density: 0.45,
    styles: {
      fontFamily: "'Merriweather', serif",
      fontSize: 12.5,
      lineHeight: 1.55,
      primaryColor: '#881337',
      borderStyle: 'double',
      bulletStyle: '•',
      marginY: 28,
      marginX: 32,
      sectionGap: 16,
    },
  },
  {
    id: 'creative-split',
    family: 'sans',
    density: 0.5,
    styles: {
      fontFamily: "'Outfit', sans-serif",
      fontSize: 13,
      lineHeight: 1.48,
      primaryColor: '#0f766e',
      borderStyle: 'badge',
      marginY: 24,
      marginX: 26,
      sectionGap: 16,
    },
  },
  {
    id: 'minimal-clean',
    family: 'sans',
    density: 0.65,
    styles: {
      fontFamily: "'Inter', sans-serif",
      fontSize: 12.5,
      lineHeight: 1.42,
      primaryColor: '#111827',
      borderStyle: 'minimal',
      bulletStyle: '-',
      marginY: 22,
      marginX: 24,
      sectionGap: 14,
    },
  },
];

export const TEMPLATE_IDS = LAYOUT_TEMPLATES.map((template) => template.id);

export function getTemplate(id) {
  return LAYOUT_TEMPLATES.find((template) => template.id === id) || null;
}

export function applyTemplate(styles, id) {
  const template = getTemplate(id);
  if (!template) {
    return styles;
  }
  return { ...styles, ...template.styles };
}

export function matchTemplate(styles) {
  return (
    LAYOUT_TEMPLATES.find((template) =>
      Object.entries(template.styles).every(([key, value]) => styles[key] === value),
    ) || null
  );
}
