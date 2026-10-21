export const sectionSpacer = '\n\n<br>';

export const snippetIds = [
  'profile',
  'summary',
  'experience',
  'education',
  'skills',
  'certification',
];

export const snippets = {
  profile: {
    heading: { en: 'PROFILE', es: 'PERFIL' },
    aliases: ['PROFILE', 'HEADER', 'CONTACT', 'PERFIL', 'CABECERA', 'CONTACTO'],
    full: {
      en: `# [Your Name]
**[Your Professional Title]**

[xxxx.xxxx@example.com](mailto:xxxx.xxxx@example.com) | +34 600 000 000 | [City, Country] | [linkedin.com/in/xxxx-xxxx](https://linkedin.com/in/xxxx-xxxx) | [github.com/xxxx-xxxx](https://github.com/xxxx-xxxx)`,
      es: `# [Tu Nombre]
**[Tu Puesto]**

[xxxx.xxxx@example.com](mailto:xxxx.xxxx@example.com) | +34 600 000 000 | [Ciudad, País] | [linkedin.com/in/xxxx-xxxx](https://linkedin.com/in/xxxx-xxxx) | [github.com/xxxx-xxxx](https://github.com/xxxx-xxxx)`,
    },
  },
  summary: {
    heading: { en: 'PROFESSIONAL SUMMARY', es: 'RESUMEN PROFESIONAL' },
    first: true,
    aliases: [
      'SUMMARY',
      'EXECUTIVE SUMMARY',
      'PROFESSIONAL PROFILE',
      'ABOUT ME',
      'RESUMEN',
      'RESUMEN EJECUTIVO',
      'PERFIL PROFESIONAL',
      'SOBRE MI',
    ],
    body: {
      en: `[Professional Title] with [X]+ years of experience in [field], specialising in **[key technology]** and **[key area]**. Track record of **[X]%** [improvement] and of leading [teams or projects] that reached [milestone].`,
      es: `[Puesto] con más de [X] años de experiencia en [área], especializado en **[tecnología clave]** y **[área clave]**. Historial de **[X]%** [mejora] y de liderazgo de [equipos o proyectos] que alcanzaron [hito].`,
    },
  },
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
      'SKILLS & COMPETENCIES',
      'HABILIDADES',
      'HABILIDADES CLAVE',
      'HABILIDADES Y COMPETENCIAS',
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
      'CERTIFICATIONS & LANGUAGES',
      'CERTIFICACIONES E IDIOMAS',
      'CERTIFICACIONES Y IDIOMAS',
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
  if (block.full) {
    return {
      heading: block.heading[language],
      body: `${block.full[language]}${sectionSpacer}`,
      aliases: block.aliases,
      verbatim: true,
    };
  }
  return {
    heading: block.heading[language],
    body: `${block.body[language]}${sectionSpacer}`,
    aliases: block.aliases,
    first: Boolean(block.first),
  };
}
