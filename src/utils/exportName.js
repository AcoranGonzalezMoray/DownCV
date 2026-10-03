const MAX_NAME = 40;

function slug(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/[\s_-]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, MAX_NAME)
    .replace(/_+$/g, '');
}

export function exportFilename(markdown, extension, { date } = {}) {
  const name = String(markdown || '').match(/^#{1,6}\s+(.+)$/m);
  const who = slug(name ? name[1] : '') || 'CV';
  const stamp = date || new Date().toISOString().slice(0, 10);
  return `${who.startsWith('CV') ? who : `CV_${who}`}_${stamp}.${extension}`;
}
