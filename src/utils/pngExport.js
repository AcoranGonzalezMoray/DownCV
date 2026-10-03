import { exportFilename } from './exportName';

export async function exportToPng(elementOrSelector = '.cv-paper', markdown = '') {
  const element =
    typeof elementOrSelector === 'string'
      ? document.querySelector(elementOrSelector)
      : elementOrSelector;
  if (!element) {
    throw new Error('CV preview element not found');
  }

  const stack = element.closest('.cv-pages') || element.parentElement;
  const sheets =
    stack && typeof stack.querySelectorAll === 'function'
      ? Array.from(stack.querySelectorAll('.cv-paper')).filter(
          (node) => !node.classList.contains('cv-paper-measure'),
        )
      : [element];

  const { default: html2canvas } = await import('html2canvas');
  const options = {
    scale: 2,
    useCORS: true,
    backgroundColor: '#ffffff',
    logging: false,
  };
  const shots = [];
  for (const sheet of sheets) {
    shots.push(await html2canvas(sheet, options));
  }

  const canvas = shots.length === 1 ? shots[0] : stackCanvases(shots);
  const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
  if (!blob) {
    throw new Error('Failed to create PNG blob');
  }

  const filename = exportFilename(markdown, 'png');
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  return true;
}

function stackCanvases(canvases) {
  const width = Math.max(...canvases.map((canvas) => canvas.width));
  const height = canvases.reduce((total, canvas) => total + canvas.height, 0);
  const merged = document.createElement('canvas');
  merged.width = width;
  merged.height = height;
  const context = merged.getContext('2d');
  context.fillStyle = '#ffffff';
  context.fillRect(0, 0, width, height);
  let y = 0;
  canvases.forEach((canvas) => {
    context.drawImage(canvas, 0, y);
    y += canvas.height;
  });
  return merged;
}
