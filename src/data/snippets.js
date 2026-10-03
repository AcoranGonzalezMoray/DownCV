export const sectionSpacer = '\n\n<br>';

export const snippetIds = ['experience', 'education', 'skills', 'certification'];

export const snippets = {
  experience: {
    heading: { en: 'WORK EXPERIENCE', es: 'EXPERIENCIA LABORAL' },
    aliases: [
      'EXPERIENCE',
      'PROFESSIONAL EXPERIENCE',
      'WORK HISTORY',
      'EXPERIENCIA',
      'EXPERIENCIA PROFESIONAL',
      'TRAYECTORIA PROFESIONAL',
    ],
    body: {
      en: `### **Company Name** | City, Country
**Job Title** | *Month Year – Month Year*
- Led the development of [project], achieving a **[X]% improvement** in [metric].
- Designed and built [system], cutting turnaround time by **[X] hours**.`,
      es: `### **Nombre de la empresa** | Ciudad, País
**Puesto** | *Mes Año – Mes Año*
- Lideré el desarrollo de [proyecto], alcanzando una mejora del **[X]%** en [métrica].
- Diseñé e implementé [sistema], reduciendo el tiempo de entrega en **[X] horas**.`,
    },
  },
  education: {
    heading: { en: 'EDUCATION', es: 'EDUCACIÓN' },
    aliases: ['ACADEMIC BACKGROUND', 'FORMACIÓN', 'FORMACION', 'ESTUDIOS'],
    body: {
      en: `### **University / Institution**
**Degree or Academic Title** | *Year – Year*
- Specialization or academic honour worth mentioning.`,
      es: `### **Universidad / Institución**
**Titulación académica** | *Año – Año*
- Especialización o distinción académica worthy of mention.`,
    },
  },
  skills: {
    heading: { en: 'TECHNICAL SKILLS', es: 'HABILIDADES TÉCNICAS' },
    aliases: [
      'SKILLS',
      'COMPETENCIES',
      'CORE SKILLS',
      'HABILIDADES',
      'HABILIDADES CLAVE',
      'COMPETENCIAS',
    ],
    body: {
      en: `- **Languages:** JavaScript, TypeScript, Python, SQL.
- **Frameworks & Tools:** React, Node.js, Git, Docker, AWS.`,
      es: `- **Lenguajes:** JavaScript, TypeScript, Python, SQL.
- **Frameworks y Herramientas:** React, Node.js, Git, Docker, AWS.`,
    },
  },
  certification: {
    heading: { en: 'CERTIFICATIONS', es: 'CERTIFICACIONES' },
    aliases: [
      'CERTIFICATES',
      'CERTIFICATIONS AND LANGUAGES',
      'CERTIFICACIONES E IDIOMAS',
      'IDIOMAS',
    ],
    body: {
      en: `- **Official Certification** - Issuing body (Year)`,
      es: `- **Certificación oficial** - Entidad emisora (Año)`,
    },
  },
};

export function snippet(id, lang) {
  const block = snippets[id];
  if (!block) {
    return null;
  }
  const language = block.heading[lang] ? lang : 'en';
  return {
    heading: block.heading[language],
    body: `${block.body[language]}${sectionSpacer}`,
    aliases: block.aliases,
  };
}
