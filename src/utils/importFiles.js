const MAX_BYTES = 8 * 1024 * 1024;

export const IMPORT_EXTENSIONS = ['.txt', '.md', '.pdf', '.docx', '.json'];

export function importKindOf(file) {
  const name = String(file?.name || '').toLowerCase();
  if (name.endsWith('.pdf')) {
    return 'pdf';
  }
  if (name.endsWith('.docx')) {
    return 'docx';
  }
  if (name.endsWith('.json')) {
    return 'json';
  }
  return 'text';
}

export function checkImportFile(file) {
  if (!file) {
    return { ok: false, reason: 'type' };
  }
  if (file.size > MAX_BYTES) {
    return { ok: false, reason: 'tooBig' };
  }
  if (importKindOf(file) === 'text' && !/\.(txt|md|markdown)$/i.test(file.name || '')) {
    return { ok: false, reason: 'type' };
  }
  return { ok: true, kind: importKindOf(file) };
}

function reasonOf(error) {
  const message = String(error?.message || '');
  if (message === 'not-a-docx' || message === 'no-decompression') {
    return 'read';
  }
  if (message === 'tooBig' || message === 'type') {
    return message;
  }
  return 'read';
}

const readAsText = (file) =>
  typeof FileReader === 'undefined'
    ? file.text()
    : new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result || ''));
        reader.onerror = () => reject(new Error('read'));
        reader.readAsText(file);
      });

const readAsArrayBuffer = (file) =>
  typeof FileReader === 'undefined'
    ? file.arrayBuffer()
    : new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = () => reject(new Error('read'));
        reader.readAsArrayBuffer(file);
      });

async function readPdf(file) {
  const { extractPdfText } = await import('./pdfText');
  const data = await readAsArrayBuffer(file);
  const extraction = await extractPdfText(data, {});
  const pages = (extraction.pages || [])
    .map((page) => (page.lines || []).join('\n').trim())
    .filter(Boolean);
  return pages.join('\n\n');
}

export function readZipEntries(bytes) {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const decoder = new TextDecoder();
  const EOCD = 0x06054b50;
  let eocd = -1;
  for (let at = bytes.length - 22; at >= 0 && at >= bytes.length - 22 - 0xffff; at -= 1) {
    if (view.getUint32(at, true) === EOCD) {
      eocd = at;
      break;
    }
  }
  if (eocd < 0) {
    return [];
  }
  let offset = view.getUint32(eocd + 16, true);
  const count = view.getUint16(eocd + 10, true);
  const entries = [];
  for (let index = 0; index < count; index += 1) {
    if (offset + 46 > bytes.length || view.getUint32(offset, true) !== 0x02014b50) {
      break;
    }
    const method = view.getUint16(offset + 10, true);
    const compressedSize = view.getUint32(offset + 20, true);
    const nameLength = view.getUint16(offset + 28, true);
    const extraLength = view.getUint16(offset + 30, true);
    const commentLength = view.getUint16(offset + 32, true);
    const local = view.getUint32(offset + 42, true);
    const name = decoder.decode(bytes.subarray(offset + 46, offset + 46 + nameLength));
    if (local + 30 <= bytes.length) {
      const localName = view.getUint16(local + 26, true);
      const localExtra = view.getUint16(local + 28, true);
      const dataStart = local + 30 + localName + localExtra;
      entries.push({
        name,
        method,
        data: bytes.subarray(dataStart, Math.min(dataStart + compressedSize, bytes.length)),
      });
    }
    offset += 46 + nameLength + extraLength + commentLength;
  }
  return entries;
}

async function inflateRaw(bytes) {
  if (typeof DecompressionStream === 'undefined') {
    throw new Error('no-decompression');
  }

  const raw = new Response(bytes).body;
  const inflated = raw.pipeThrough(new DecompressionStream('deflate-raw'));
  return new Uint8Array(await new Response(inflated).arrayBuffer());
}

export async function readDocxText(buffer) {
  const bytes = new Uint8Array(buffer);
  const entry = readZipEntries(bytes).find((item) => item.name === 'word/document.xml');
  if (!entry) {
    throw new Error('not-a-docx');
  }
  const xml = new TextDecoder().decode(
    entry.method === 0 ? entry.data : await inflateRaw(entry.data),
  );
  const paragraphs = xml.match(/<w:p[ >][\s\S]*?<\/w:p>|<w:p\/>/g) || [];
  const decode = (value) =>
    value
      .replace(/<w:tab\/>/g, '\t')
      .replace(/<w:br\/>/g, '\n')
      .replace(/<[^>]+>/g, '')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&apos;/g, "'")
      .replace(/&nbsp;/g, ' ')
      .trim();
  return paragraphs.map(decode).filter(Boolean).join('\n');
}

export async function readImportFile(file) {
  const check = checkImportFile(file);
  if (!check.ok) {
    const error = new Error(check.reason);
    error.reason = check.reason;
    throw error;
  }
  try {
    if (check.kind === 'pdf') {
      return { text: await readPdf(file), kind: 'pdf' };
    }
    if (check.kind === 'docx') {
      return { text: await readDocxText(await readAsArrayBuffer(file)), kind: 'docx' };
    }
    if (check.kind === 'json') {
      const raw = await readAsText(file);
      try {
        const { jsonResumeToMarkdown } = await import('./jsonResume');
        return { text: jsonResumeToMarkdown(raw), kind: 'json' };
      } catch (_err) {
        return { text: raw, kind: 'json' };
      }
    }
    return { text: await readAsText(file), kind: 'text' };
  } catch (error) {
    const failure = new Error(reasonOf(error));
    failure.reason = reasonOf(error);
    throw failure;
  }
}
