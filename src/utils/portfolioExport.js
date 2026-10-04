import { exportFilename } from './exportName';

const ESCAPES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

const escapeHtml = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ESCAPES[char]);

const CODE_PLACEHOLDER = 'CODE';

const SPACER_RE = /^(?:<br\s*\/?>|<hr\s*\/?>|\s|[-*_=])+$/i;

export function inlineHtml(markdown = '') {
  let html = escapeHtml(markdown).replace(
    /`([^`]+)`/g,
    `${CODE_PLACEHOLDER}$1${CODE_PLACEHOLDER}`,
  );
  html = html
    .replace(/\*\*([^*\n]+)\*\*/g, '<strong class="font-semibold text-white">$1</strong>')
    .replace(/__([^_\n]+)__/g, '<span class="underline">$1</span>')
    .replace(/(^|[\s(])\*([^*\n]+)\*/g, '$1<em>$2</em>')
    .replace(/(^|[\s(])_([^_\n]+)_/g, '$1<em>$2</em>')
    .replace(/~~([^~\n]+)~~/g, '<s>$1</s>')
    .replace(
      /\[([^\]\n]+)\]\(([^)\s]+)\)/g,
      '<a href="$2" class="text-cyan-400 hover:underline" target="_blank" rel="noreferrer">$1</a>',
    );
  html = html.replace(/\*\*/g, '').replace(/__/g, '');
  return html.replace(
    new RegExp(`${CODE_PLACEHOLDER}([^]+)${CODE_PLACEHOLDER}`, 'g'),
    '<code class="rounded bg-slate-900 px-1 py-0.5 text-xs text-cyan-300">$1</code>',
  );
}

const asciiEntities = (html) =>
  html.replace(/[\u0080-\uffff]/g, (char) => `&#${char.codePointAt(0)};`);

export function generatePortfolioHtml(markdown = '') {
  const text = String(markdown || '').trim();
  const lines = text.split('\n').map((line) => line.trim());

  let name = 'My Portfolio';
  let title = 'Professional';
  const contacts = [];

  for (let i = 0; i < Math.min(lines.length, 8); i++) {
    const line = lines[i];
    if (!line || SPACER_RE.test(line)) {
      continue;
    }
    if (line.startsWith('# ') && name === 'My Portfolio') {
      name = line.replace(/^#\s+/, '').trim();
    } else if (line.startsWith('**') && line.endsWith('**') && title === 'Professional') {
      title = line.replace(/^\*\*|\*\*$/g, '').trim();
    } else if (line.includes('@') || line.includes('|') || line.includes('http')) {
      line.split('|').forEach((entry) => {
        const item = entry.trim();
        if (item) {
          contacts.push(item);
        }
      });
    }
  }

  const sections = [];
  let currentSection = null;

  lines.forEach((line) => {
    if (line.startsWith('### ') || line.startsWith('## ')) {
      const secTitle = line.replace(/^#{2,3}\s+/, '').trim();
      currentSection = { title: secTitle, content: [] };
      sections.push(currentSection);
      return;
    }
    if (currentSection && line && !SPACER_RE.test(line)) {
      currentSection.content.push(line);
    }
  });

  const sectionsHtml = sections
    .map((sec) => {
      let bodyHtml = '';
      const items = sec.content;

      if (/skill|habilidad|competencia|language|idioma/i.test(sec.title)) {
        const skillsList = items
          .map((item) => item.replace(/^[-*\u2022]\s*/, '').replace(/^\*\*.*?\*\*:\s*/, ''))
          .join(', ')
          .split(',')
          .map((value) => value.trim())
          .filter(Boolean);

        bodyHtml = `
        <div class="flex flex-wrap gap-2 mt-4">
          ${skillsList
            .map(
              (value) =>
                `<span class="px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-800 text-cyan-400 border border-slate-700/60">${escapeHtml(
                  value,
                )}</span>`,
            )
            .join('\n')}
        </div>`;
      } else {
        const parsedItems = [];
        let currentItem = null;

        items.forEach((line) => {
          if (line.startsWith('#### ')) {
            currentItem = { title: line.replace(/^####\s+/, ''), bullets: [], notes: [] };
            parsedItems.push(currentItem);
          } else if (currentItem && line.startsWith('- ')) {
            currentItem.bullets.push(line.replace(/^-\s+/, ''));
          } else if (currentItem) {
            currentItem.notes.push(line);
          } else {
            parsedItems.push({ paragraph: line });
          }
        });

        const usable = (values) => values.filter((line) => line && !SPACER_RE.test(line));

        bodyHtml = `
        <div class="space-y-6 mt-4">
          ${parsedItems
            .map((item) => {
              if (item.paragraph !== undefined) {
                return `<p class="text-slate-300 text-sm leading-relaxed">${inlineHtml(item.paragraph)}</p>`;
              }
              const notes = usable(item.notes);
              return `
              <div class="p-5 rounded-xl bg-slate-800/50 border border-slate-700/50 hover:border-cyan-500/40 transition">
                <h4 class="text-base font-semibold text-white">${inlineHtml(item.title)}</h4>
                ${
                  item.bullets.length > 0
                    ? `<ul class="mt-3 space-y-1.5 text-sm text-slate-300 list-disc list-inside">
                        ${item.bullets.map((b) => `<li>${inlineHtml(b)}</li>`).join('\n')}
                       </ul>`
                    : ''
                }
                ${
                  notes.length > 0
                    ? `<div class="mt-2 space-y-1 text-sm text-slate-400">${notes
                        .map((line) => `<p>${inlineHtml(line)}</p>`)
                        .join('\n')}</div>`
                    : ''
                }
              </div>`;
            })
            .join('\n')}
        </div>`;
      }

      return `
      <section class="mt-12">
        <h3 class="text-xl font-bold tracking-tight text-white border-b border-slate-800 pb-3 flex items-center gap-2">
          <span class="w-2 h-2 rounded-full bg-cyan-400"></span>
          ${inlineHtml(sec.title)}
        </h3>
        ${bodyHtml}
      </section>`;
    })
    .join('\n');

  return asciiEntities(`<!DOCTYPE html>
<html lang="en" class="dark scroll-smooth">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(name)} - ${escapeHtml(title)}</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
  <style>
    body { font-family: 'Inter', sans-serif; }
  </style>
</head>
<body class="bg-slate-950 text-slate-100 min-h-screen selection:bg-cyan-500 selection:text-black">
  <div class="max-w-4xl mx-auto px-6 py-16">
    <!-- Header / Hero -->
    <header class="pb-10 border-b border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-6">
      <div>
        <h1 class="text-4xl font-extrabold tracking-tight text-white sm:text-5xl">${inlineHtml(name)}</h1>
        <p class="mt-2 text-xl font-medium text-cyan-400">${inlineHtml(title)}</p>
        <div class="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-sm text-slate-400">
          ${contacts
            .map(
              (c) =>
                `<span class="inline-flex items-center gap-1.5">&bull; <span>${inlineHtml(c)}</span></span>`,
            )
            .join('\n')}
        </div>
      </div>
      <div class="shrink-0">
        <span class="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-950/80 text-emerald-400 border border-emerald-800/50">
          <span class="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span> Available for hire
        </span>
      </div>
    </header>

    <!-- Sections -->
    <main>
      ${sectionsHtml}
    </main>

    <!-- Footer -->
    <footer class="mt-20 pt-8 border-t border-slate-800/80 text-center text-xs text-slate-500">
      <p>Created and exported with <a href="https://github.com/AcoranGonzalezMoray/DownCV" class="text-cyan-400 hover:underline">DownCV</a></p>
    </footer>
  </div>
</body>
</html>`);
}

export function exportToPortfolioHtml(markdown = '') {
  const html = generatePortfolioHtml(markdown);
  const blob = new Blob(['\ufeff', html], { type: 'text/html;charset=utf-8' });
  const filename = exportFilename(markdown, 'html');
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  return true;
}
