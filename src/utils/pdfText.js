let pdfjsPromise = null;

async function loadPdfjs() {
  if (!pdfjsPromise) {
    pdfjsPromise = Promise.all([
      import('pdfjs-dist/build/pdf.mjs'),
      import('pdfjs-dist/build/pdf.worker.min.mjs?url'),
    ]).then(([pdfjs, worker]) => {
      pdfjs.GlobalWorkerOptions.workerSrc = worker.default;
      return pdfjs;
    });
  }
  return pdfjsPromise;
}

const LINE_TOLERANCE = 0.8;

function pageText(items) {
  const lines = [];
  let current = '';
  let previous = null;

  for (const item of items) {
    if (typeof item.str !== 'string') {
      continue;
    }
    const x = item.transform[4];
    const y = item.transform[5];
    const size = item.height || Math.abs(item.transform[3]) || 10;

    if (previous) {
      const sameLine = Math.abs(y - previous.y) <= LINE_TOLERANCE;
      if (!sameLine) {
        lines.push(current);
        current = '';
      } else if (x - (previous.x + previous.width) > size * 0.3) {
        current += ' ';
      }
    }
    current += item.str;
    previous = { x, y, width: item.width || 0, size };
    if (item.hasEOL) {
      lines.push(current);
      current = '';
      previous = null;
    }
  }
  if (current) {
    lines.push(current);
  }
  return lines.map((line) => line.replace(/[ \t]+/g, ' ').trim()).filter((line) => line.length > 0);
}

export async function extractPdfText(data, deps = {}) {
  const pdfjs = deps.pdfjs || (await loadPdfjs());
  const bytes = data instanceof Uint8Array ? data : new Uint8Array(data);
  const document = await pdfjs.getDocument({
    data: bytes,
    isEvalSupported: false,
    disableFontFace: true,
    verbosity: pdfjs.VerbosityLevel?.ERRORS ?? 0,
    ...(deps.standardFontDataUrl ? { standardFontDataUrl: deps.standardFontDataUrl } : {}),
  }).promise;
  const pages = [];

  for (let index = 1; index <= document.numPages; index += 1) {
    const page = await document.getPage(index);
    const content = await page.getTextContent();
    pages.push({ index, lines: pageText(content.items) });
    page.cleanup();
  }
  const release = document.destroy || document.cleanup;
  if (typeof release === 'function') {
    await release.call(document);
  }

  const text = pages.map((page) => page.lines.join('\n')).join('\n\n');
  return {
    text,
    pages,
    pageCount: pages.length,
    charCount: text.replace(/\s+/g, ' ').trim().length,
    wordCount: text.split(/\s+/).filter(Boolean).length,
  };
}
