import { exportFilename } from './exportName';

const ESCAPES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

const escapeHtml = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ESCAPES[char]);

const asciiEntities = (html) =>
  html.replace(/[\u0080-\uffff]/g, (char) => `&#${char.codePointAt(0)};`);

const GRADE_TONE = {
  A: 'text-emerald-400 border-emerald-500/40',
  B: 'text-sky-400 border-sky-500/40',
  C: 'text-amber-400 border-amber-500/40',
  D: 'text-orange-400 border-orange-500/40',
  F: 'text-red-400 border-red-500/40',
};

const bar = (percent, tone) => `
      <div class="h-1.5 w-full rounded-full bg-slate-800 overflow-hidden">
        <div class="h-full rounded-full ${tone}" style="width: ${Math.max(0, Math.min(100, percent))}%"></div>
      </div>`;


export function generateAtsReport(record, { dimensions = [], t, title = 'ATS report' } = {}) {
  const checks = record?.checks || [];
  const gaps = record?.gaps || [];
  const max = record?.maxScore || 100;
  const tone = GRADE_TONE[record?.grade] || GRADE_TONE.F;

  const rows = (list, withPoints) =>
    list
      .map(
        (check) => `
        <li class="flex items-start gap-3 border-b border-slate-800/60 py-2 last:border-0">
          <span class="mt-0.5 text-xs font-mono ${check.pass ? 'text-emerald-400' : 'text-red-400'}">${check.pass ? 'OK' : '--'}</span>
          <span class="min-w-0 flex-1">
            <span class="block text-sm font-medium text-slate-100">${escapeHtml(check.title)}</span>
            <span class="block text-xs text-slate-400">${escapeHtml(check.msg)}</span>
            ${
              check.examples?.length
                ? `<span class="block mt-1 text-[11px] text-slate-500">${check.examples
                    .slice(0, 3)
                    .map((example) => escapeHtml(example))
                    .join(' &middot; ')}</span>`
                : ''
            }
          </span>
          ${
            withPoints
              ? `<span class="shrink-0 font-mono text-xs text-slate-400">${check.points}/${check.max}</span>`
              : ''
          }
        </li>`,
      )
      .join('');

  const dims = dimensions.length
    ? `<div class="grid gap-3 sm:grid-cols-2 mt-6">
            ${dimensions
              .map(
                (dimension) => `
            <div class="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
              <div class="flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-slate-400">
                <span>${escapeHtml(dimension.id)}</span>
                <span class="font-mono">${dimension.percent}%</span>
              </div>
              ${bar(dimension.percent, dimension.percent >= 80 ? 'bg-emerald-400' : 'bg-amber-400')}
            </div>`,
              )
              .join('')}
          </div>`
    : '';

  return asciiEntities(`<!DOCTYPE html>
<html lang="en" class="dark">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(title)} - ${record?.score ?? 0}/${max}</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
  <style>
    body { font-family: 'Inter', sans-serif; }
    @media print { .no-print { display: none; } }
  </style>
</head>
<body class="bg-slate-950 text-slate-100 min-h-screen">
  <div class="max-w-3xl mx-auto px-6 py-12">
    <header class="flex flex-wrap items-end justify-between gap-6 border-b border-slate-800 pb-6">
      <div>
        <h1 class="text-3xl font-extrabold tracking-tight text-white">${escapeHtml(title)}</h1>
        <p class="mt-1 text-sm text-slate-400">
          ${record?.pageCount ?? 0} pages &middot; ${record?.wordCount ?? 0} words &middot;
          ${record?.charCount ?? 0} characters
        </p>
      </div>
      <div class="text-right">
        <span class="inline-flex items-baseline gap-1 rounded-xl border ${tone} px-4 py-2">
          <span class="text-3xl font-extrabold">${record?.score ?? 0}</span>
          <span class="font-mono text-xs text-slate-400">/${max}</span>
          <span class="ml-1 text-lg font-bold">${escapeHtml(record?.grade ?? 'F')}</span>
        </span>
      </div>
    </header>

    <main class="mt-8 space-y-8">
      ${
        gaps.length
          ? `<section>
        <h2 class="text-xs font-semibold uppercase tracking-wider text-amber-400">${escapeHtml(
          t?.atsReportGaps ?? 'What is missing',
        )}</h2>
        <ul class="mt-2 space-y-1 text-sm text-slate-300">
          ${gaps
            .map(
              (gap) =>
                `<li><span class="font-mono text-amber-400">-${gap.lost}</span> ${escapeHtml(
                  gap.title,
                )}: ${escapeHtml(gap.msg)}</li>`,
            )
            .join('')}
        </ul>
      </section>`
          : ''
      }

      ${dims}

      <section>
        <h2 class="text-xs font-semibold uppercase tracking-wider text-slate-400">${escapeHtml(
          t?.atsReportChecks ?? 'Every check',
        )}</h2>
        <ul class="mt-2">${rows(checks, true)}</ul>
      </section>
    </main>

    <footer class="mt-12 border-t border-slate-800/80 pt-6 text-center text-xs text-slate-500">
      <p>${new Date(record?.createdAt || Date.now()).toLocaleString()}</p>
      <p class="mt-1">${escapeHtml(
        t?.atsReportFooter ?? 'Generated with DownCV',
      )}</p>
    </footer>
  </div>
</body>
</html>`);
}

export function downloadAtsReport(record, options = {}) {
  const html = generateAtsReport(record, options);
  const blob = new Blob(['\ufeff', html], { type: 'text/html;charset=utf-8' });
  const filename = exportFilename(options.sourceMarkdown || '', 'html').replace(
    /\.html$/i,
    '-ats.html',
  );
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  return filename;
}
