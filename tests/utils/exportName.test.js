import { describe, it, expect } from 'vitest';
import { exportFilename } from '../../src/utils/exportName';

const day = { date: '2026-09-27' };

describe('exportFilename', () => {
  it('names the file after the person and the day', () => {
    expect(exportFilename('# Ana Gómez Ruiz\n\nana@mail.com', 'pdf', day)).toBe(
      'CV_Ana_Gomez_Ruiz_2026-09-27.pdf',
    );
    expect(exportFilename('# Ana Gómez Ruiz', 'docx', day)).toBe(
      'CV_Ana_Gomez_Ruiz_2026-09-27.docx',
    );
    expect(exportFilename('# Ana Gómez Ruiz', 'rtf', day)).toBe('CV_Ana_Gomez_Ruiz_2026-09-27.rtf');
  });

  it('takes the name from the first heading, whatever its level', () => {
    expect(exportFilename('## Globex recruiter', 'pdf', day)).toBe(
      'CV_Globex_recruiter_2026-09-27.pdf',
    );
  });

  it('falls back to CV when there is no name to read', () => {
    expect(exportFilename('', 'pdf', day)).toBe('CV_2026-09-27.pdf');
    expect(exportFilename('## EXPERIENCE\n\n- Something', 'pdf', day)).toBe(
      'CV_EXPERIENCE_2026-09-27.pdf',
    );
  });

  it('never repeats the CV prefix the name already carries', () => {
    expect(exportFilename('# CV de Ana', 'pdf', day)).toBe('CV_de_Ana_2026-09-27.pdf');
  });

  it('leaves nothing a file system would refuse', () => {
    const name = exportFilename('#  Ana / López  <CV>  ', 'docx', day);
    expect(name).toBe('CV_Ana_Lopez_CV_2026-09-27.docx');
    expect(name).not.toMatch(/[\\/:*?"<>|]/);
  });

  it('keeps the name short enough for every file system', () => {
    const long = `# ${'Ana'.repeat(40)}`;
    const name = exportFilename(long, 'pdf', day);

    expect(name.length).toBeLessThanOrEqual(3 + 40 + 1 + 10 + 4);
    expect(name.endsWith('.pdf')).toBe(true);
  });

  it('uses today when no date is given', () => {
    const today = new Date().toISOString().slice(0, 10);
    expect(exportFilename('# Ana', 'pdf')).toBe(`CV_Ana_${today}.pdf`);
  });
});
