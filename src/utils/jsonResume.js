export function jsonResumeToMarkdown(json) {
  const data = typeof json === 'string' ? JSON.parse(json) : json;
  if (!data || typeof data !== 'object') {
    throw new Error('invalid-json');
  }

  const lines = [];
  const basics = data.basics || {};

  if (basics.name) {
    lines.push(`# ${basics.name.trim()}`);
  }
  if (basics.label) {
    lines.push(`**${basics.label.trim()}**`);
  }

  const contacts = [];
  if (basics.email) {
    contacts.push(basics.email.trim());
  }
  if (basics.phone) {
    contacts.push(basics.phone.trim());
  }
  if (basics.url) {
    contacts.push(basics.url.trim());
  }
  if (basics.location?.city) {
    const loc = [basics.location.city, basics.location.countryCode || basics.location.region]
      .filter(Boolean)
      .join(', ');
    if (loc) {
      contacts.push(loc);
    }
  }
  if (Array.isArray(basics.profiles)) {
    basics.profiles.forEach((p) => {
      if (p.url) {
        contacts.push(p.url.trim());
      } else if (p.username && p.network) {
        contacts.push(`${p.network}: ${p.username}`);
      }
    });
  }
  if (contacts.length > 0) {
    lines.push(contacts.join(' | '));
  }

  lines.push('');

  if (basics.summary) {
    lines.push('### Professional Summary');
    lines.push(basics.summary.trim());
    lines.push('');
  }

  if (Array.isArray(data.work) && data.work.length > 0) {
    lines.push('### Work Experience');
    data.work.forEach((w) => {
      const position = w.position || '';
      const name = w.name || '';
      const start = w.startDate || '';
      const end = w.endDate || 'Present';
      const dateStr = start ? ` | ${start} - ${end}` : '';

      if (position && name) {
        lines.push(`#### ${position} - ${name}${dateStr}`);
      } else if (position || name) {
        lines.push(`#### ${position || name}${dateStr}`);
      }

      if (w.summary) {
        lines.push(w.summary.trim());
      }

      if (Array.isArray(w.highlights)) {
        w.highlights.forEach((h) => {
          if (h && typeof h === 'string') {
            lines.push(`- ${h.trim()}`);
          }
        });
      }
      lines.push('');
    });
  }

  if (Array.isArray(data.education) && data.education.length > 0) {
    lines.push('### Education');
    data.education.forEach((edu) => {
      const inst = edu.institution || '';
      const study = [edu.studyType, edu.area].filter(Boolean).join(' in ');
      const start = edu.startDate || '';
      const end = edu.endDate || '';
      const dateStr = start || end ? ` | ${start}${end ? ' - ' + end : ''}` : '';

      if (study && inst) {
        lines.push(`#### ${study} - ${inst}${dateStr}`);
      } else if (study || inst) {
        lines.push(`#### ${study || inst}${dateStr}`);
      }

      if (edu.score) {
        lines.push(`Grade / GPA: ${edu.score}`);
      }
      if (Array.isArray(edu.courses) && edu.courses.length > 0) {
        lines.push(`- Relevant courses: ${edu.courses.join(', ')}`);
      }
      lines.push('');
    });
  }

  if (Array.isArray(data.skills) && data.skills.length > 0) {
    lines.push('### Skills');
    data.skills.forEach((s) => {
      const name = s.name ? `**${s.name}**: ` : '';
      const keywords = Array.isArray(s.keywords) ? s.keywords.join(', ') : s.keywords || '';
      if (name || keywords) {
        lines.push(`- ${name}${keywords}`);
      }
    });
    lines.push('');
  }

  if (Array.isArray(data.projects) && data.projects.length > 0) {
    lines.push('### Projects');
    data.projects.forEach((p) => {
      const title = p.name || '';
      const role = p.role ? ` (${p.role})` : '';
      if (title) {
        lines.push(`#### ${title}${role}`);
      }
      if (p.description) {
        lines.push(p.description.trim());
      }
      if (Array.isArray(p.highlights)) {
        p.highlights.forEach((h) => lines.push(`- ${h.trim()}`));
      }
      lines.push('');
    });
  }

  if (Array.isArray(data.certificates) && data.certificates.length > 0) {
    lines.push('### Certifications');
    data.certificates.forEach((c) => {
      const name = c.name || '';
      const issuer = c.issuer ? ` - ${c.issuer}` : '';
      const date = c.date ? ` (${c.date})` : '';
      lines.push(`- ${name}${issuer}${date}`);
    });
    lines.push('');
  }

  const result = lines
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
  return result ? result + '\n' : '';
}

export function markdownToJsonResume(markdown = '') {
  const text = String(markdown || '').trim();
  const resume = {
    $schema: 'https://raw.githubusercontent.com/jsonresume/resume-schema/v1.0.0/schema.json',
    basics: {
      name: '',
      label: '',
      email: '',
      phone: '',
      url: '',
      summary: '',
      profiles: [],
    },
    work: [],
    education: [],
    skills: [],
    projects: [],
    certificates: [],
  };

  if (!text) {
    return resume;
  }

  const lines = text.split('\n').map((l) => l.trim());
  let currentSection = 'header';
  let currentEntry = null;

  for (let i = 0; i < Math.min(lines.length, 10); i++) {
    const line = lines[i];
    if (line.startsWith('# ') && !resume.basics.name) {
      resume.basics.name = line.replace(/^#\s+/, '').trim();
    } else if (line.startsWith('**') && line.endsWith('**') && !resume.basics.label) {
      resume.basics.label = line.replace(/^\*\*|\*\*$/g, '').trim();
    } else if (
      line.includes('@') ||
      line.includes('http') ||
      line.includes('|') ||
      /\d{3,}/.test(line)
    ) {
      const parts = line.split('|').map((p) => p.trim());
      parts.forEach((part) => {
        if (part.includes('@') && !resume.basics.email) {
          resume.basics.email = part.replace(/^[<(\[]|[>)\]]$/g, '').trim();
        } else if (
          /linkedin\.com/i.test(part) ||
          /github\.com/i.test(part) ||
          /^https?:\/\//i.test(part)
        ) {
          if (!resume.basics.url) {
            resume.basics.url = part;
          }
          const network = /linkedin/i.test(part)
            ? 'LinkedIn'
            : /github/i.test(part)
              ? 'GitHub'
              : 'Website';
          resume.basics.profiles.push({ network, url: part });
        } else if (/^[+]?[(]?[0-9]{1,4}[)]?[-\s./0-9]{6,}$/.test(part) && !resume.basics.phone) {
          resume.basics.phone = part;
        }
      });
    }
  }

  const sectionRegex = /^#{2,3}\s+(.+)$/;
  const subSectionRegex = /^#{4}\s+(.+)$/;

  lines.forEach((line) => {
    const secMatch = line.match(sectionRegex);
    if (secMatch) {
      const title = secMatch[1].toLowerCase();
      if (/experience|experiencia|laboral|work/i.test(title)) {
        currentSection = 'work';
      } else if (/education|educaci|formaci/i.test(title)) {
        currentSection = 'education';
      } else if (/skill|habilidad|competencia|tecnolog/i.test(title)) {
        currentSection = 'skills';
      } else if (/project|proyecto/i.test(title)) {
        currentSection = 'projects';
      } else if (/certif|curso/i.test(title)) {
        currentSection = 'certificates';
      } else if (/summary|perfil|extracto|about/i.test(title)) {
        currentSection = 'summary';
      } else {
        currentSection = 'other';
      }
      currentEntry = null;
      return;
    }

    if (currentSection === 'summary') {
      if (line && !line.startsWith('#')) {
        resume.basics.summary = (resume.basics.summary ? resume.basics.summary + ' ' : '') + line;
      }
      return;
    }

    if (currentSection === 'work') {
      const subMatch = line.match(subSectionRegex);
      if (subMatch) {
        const header = subMatch[1];
        let position = header;
        let company = '';
        let startDate = '';
        let endDate = '';

        if (header.includes('|')) {
          const [roleComp, dates] = header.split('|').map((s) => s.trim());
          if (roleComp.includes('-')) {
            const parts = roleComp.split('-').map((s) => s.trim());
            position = parts[0];
            company = parts[1];
          } else {
            position = roleComp;
          }
          if (dates && dates.includes('-')) {
            const d = dates.split('-').map((s) => s.trim());
            startDate = d[0];
            endDate = d[1];
          }
        } else if (header.includes('-')) {
          const parts = header.split('-').map((s) => s.trim());
          position = parts[0];
          company = parts[1];
        }

        currentEntry = {
          name: company || position,
          position: position || company,
          startDate,
          endDate,
          highlights: [],
        };
        resume.work.push(currentEntry);
        return;
      }

      if (currentEntry && line.startsWith('- ')) {
        currentEntry.highlights.push(line.replace(/^-\s+/, '').trim());
      }
    } else if (currentSection === 'education') {
      const subMatch = line.match(subSectionRegex);
      if (subMatch) {
        const header = subMatch[1];
        let institution = header;
        let studyType = '';
        if (header.includes('-')) {
          const parts = header.split('-').map((s) => s.trim());
          studyType = parts[0];
          institution = parts[1];
        }
        currentEntry = {
          institution,
          studyType,
          courses: [],
        };
        resume.education.push(currentEntry);
        return;
      }
      if (currentEntry && line.startsWith('- ')) {
        currentEntry.courses.push(line.replace(/^-\s+/, '').trim());
      }
    } else if (currentSection === 'skills') {
      if (line.startsWith('- ')) {
        const skillText = line.replace(/^-\s+/, '').trim();
        if (skillText.includes(':')) {
          const [cat, items] = skillText.split(':').map((s) => s.trim());
          const cleanCat = cat.replace(/^\*\*|\*\*$/g, '');
          const keywords = items
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean);
          resume.skills.push({ name: cleanCat, keywords });
        } else {
          const keywords = skillText
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean);
          resume.skills.push({ name: 'Skills', keywords });
        }
      }
    } else if (currentSection === 'certificates') {
      if (line.startsWith('- ')) {
        const certName = line.replace(/^-\s+/, '').trim();
        resume.certificates.push({ name: certName });
      }
    }
  });

  return resume;
}
