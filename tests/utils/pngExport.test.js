import { describe, it, expect, vi, beforeEach } from 'vitest';
import { exportToPng } from '../../src/utils/pngExport';

const shot = (width, height) => ({
  width,
  height,
  toBlob: (cb) => cb(new Blob(['fake-image'], { type: 'image/png' })),
});

const html2canvasMock = vi.fn(() => Promise.resolve(shot(100, 200)));

vi.mock('html2canvas', () => ({
  default: (element, options) => html2canvasMock(element, options),
}));


const buildStack = (count) => {
  const stack = document.createElement('div');
  stack.className = 'cv-pages';
  for (let index = 0; index < count; index += 1) {
    const sheet = document.createElement('div');
    sheet.className = 'cv-paper';
    sheet.dataset.page = String(index + 1);
    stack.appendChild(sheet);
  }

  const measure = document.createElement('div');
  measure.className = 'cv-paper cv-paper-measure';
  stack.appendChild(measure);
  document.body.appendChild(stack);
  return stack;
};

describe('exportToPng', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    html2canvasMock.mockClear();
    html2canvasMock.mockImplementation(() => Promise.resolve(shot(100, 200)));
    global.URL.createObjectURL = vi.fn(() => 'blob:fake-url');
    global.URL.revokeObjectURL = vi.fn();
  });

  it('throws an error if target preview element is not found', async () => {
    await expect(exportToPng('#non-existent-element', '')).rejects.toThrow(
      'CV preview element not found',
    );
  });

  it('generates a downloadable PNG from a canvas element', async () => {
    const fakeElement = document.createElement('div');
    fakeElement.className = 'cv-paper';
    document.body.appendChild(fakeElement);

    const result = await exportToPng(fakeElement, '# Jane Doe');
    expect(result).toBe(true);
    expect(global.URL.createObjectURL).toHaveBeenCalled();
  });

  it('captures every sheet of a CV that runs to two pages', async () => {
    const stack = buildStack(2);
    const created = [];
    
    const originalCreate = document.createElement.bind(document);
    vi.spyOn(document, 'createElement').mockImplementation((tag) => {
      const node = originalCreate(tag);
      if (tag === 'canvas') {
        created.push(node);
        node.getContext = () => ({ fillRect: vi.fn(), drawImage: vi.fn() });
        node.toBlob = (cb) => cb(new Blob(['stacked'], { type: 'image/png' }));
      }
      return node;
    });

    await exportToPng(stack.querySelector('.cv-paper'), '# Jane Doe');


    expect(html2canvasMock).toHaveBeenCalledTimes(2);
    expect(html2canvasMock.mock.calls.map(([node]) => node.dataset.page)).toEqual(['1', '2']);
    expect(created).toHaveLength(1);
    expect(created[0].height).toBe(400);

    document.createElement.mockRestore();
  });

  it('asks for a high resolution image of a white page', async () => {
    const stack = buildStack(1);
    await exportToPng(stack.querySelector('.cv-paper'), '');
    expect(html2canvasMock).toHaveBeenCalledWith(expect.anything(), {
      scale: 2,
      useCORS: true,
      backgroundColor: '#ffffff',
      logging: false,
    });
  });
});
