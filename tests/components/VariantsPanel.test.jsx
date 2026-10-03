import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import React from 'react';
import VariantsPanel from '../../src/components/VariantsPanel';
import { translations } from '../../src/data/translations';

const t = translations.en;

const BASE =
  '# Ana\n\n## SKILLS\n\nReact, TypeScript\n\n## EXPERIENCE\n\n- Led the billing migration\n';

const tailored = `${BASE}\n- Shipped a Kubernetes operator for payments\n`;

const noFile = {
  supported: true,
  isLinked: false,
  busy: false,
  status: 'idle',
  fileName: null,
  link: vi.fn(),
  save: vi.fn(),
  unlink: vi.fn(),
  markDirty: vi.fn(),
};

const variant = (over = {}) => ({
  id: 'var_acme_1',
  name: 'Acme · Fullstack',
  baseId: null,
  markdown: tailored,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  ...over,
});

const renderPanel = (props = {}) => {
  const setVariants = vi.fn();
  const onOpenVariant = vi.fn();
  const onSaveCurrent = vi.fn();
  render(
    <VariantsPanel
      markdown={BASE}
      variants={[]}
      setVariants={setVariants}
      activeVariantId={null}
      onOpenVariant={onOpenVariant}
      onSaveCurrent={onSaveCurrent}
      t={t}
      localFile={noFile}
      {...props}
    />,
  );
  return { setVariants, onOpenVariant, onSaveCurrent };
};

const typeName = (value) => {
  fireEvent.change(screen.getByPlaceholderText('Acme · Frontend Engineer'), {
    target: { value },
  });
};

describe('VariantsPanel', () => {
  afterEach(() => cleanup());

  it('says what the panel is for, and offers the first version', () => {
    renderPanel();
    expect(screen.getByText(/One CV per application/)).toBeTruthy();
    typeName('Acme');
    fireEvent.click(screen.getByRole('button', { name: /Save this CV as a new version/ }));
  });

  it('saves the CV on screen as a named version, without asking to be told again', () => {
    const { setVariants, onOpenVariant } = renderPanel();
    typeName('Acme · Fullstack');
    fireEvent.click(screen.getByRole('button', { name: /Save this CV as a new version/ }));

    const update = setVariants.mock.calls[0][0];
    const next = typeof update === 'function' ? update([]) : update;
    expect(next).toHaveLength(1);
    expect(next[0].name).toBe('Acme · Fullstack');

    expect(next[0].markdown).toBe(BASE);

    expect(onOpenVariant).toHaveBeenCalledWith(next[0].id, BASE);
  });

  it('refuses a version with no name, because a version with no name is not one', () => {
    const { setVariants } = renderPanel();
    fireEvent.click(screen.getByRole('button', { name: /Save this CV as a new version/ }));
    expect(setVariants).not.toHaveBeenCalled();
  });

  it('names the words a version says that the CV on screen does not', () => {
    renderPanel({ variants: [variant()], activeVariantId: 'var_acme_1' });
    const row = screen.getByText('Acme · Fullstack').closest('li').textContent;
    expect(row).toMatch(/kubernetes/);
    expect(row).toMatch(/payments/);
  });

  it('says when a version says nothing the base does not', () => {
    renderPanel({ variants: [variant({ markdown: BASE })] });
    expect(screen.getByText(/Identical to the CV on screen/)).toBeTruthy();
  });

  it('opens a version, and says how to get back to storing changes in it', () => {
    const { onOpenVariant, onSaveCurrent } = renderPanel({
      variants: [variant()],
      activeVariantId: 'var_acme_1',
    });
    fireEvent.click(screen.getByText('Acme · Fullstack'));
    expect(onOpenVariant).toHaveBeenCalledWith('var_acme_1');

    fireEvent.click(screen.getByRole('button', { name: /Save the changes into this version/ }));
    expect(onSaveCurrent).toHaveBeenCalledWith('var_acme_1');
  });

  it('renames a version in place, and abandons the rename on Escape', () => {
    const { setVariants } = renderPanel({ variants: [variant()] });
    fireEvent.click(screen.getByRole('button', { name: 'Rename: Acme · Fullstack' }));

    const field = screen.getByDisplayValue('Acme · Fullstack');
    fireEvent.change(field, { target: { value: 'Acme · Backend' } });
    fireEvent.keyDown(field, { key: 'Escape' });
    expect(setVariants).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'Rename: Acme · Fullstack' }));
    const again = screen.getByDisplayValue('Acme · Fullstack');
    fireEvent.change(again, { target: { value: 'Acme · Backend' } });
    fireEvent.keyDown(again, { key: 'Enter' });
    const update = setVariants.mock.calls[0][0];
    const next = typeof update === 'function' ? update([variant()]) : update;
    expect(next[0].name).toBe('Acme · Backend');
    expect(next).toHaveLength(1);
  });

  it('deletes a version and duplicates one, and both go through the list', () => {
    const { setVariants } = renderPanel({ variants: [variant()] });

    fireEvent.click(screen.getByRole('button', { name: 'Duplicate: Acme · Fullstack' }));
    const copy = setVariants.mock.calls[0][0]([variant()]);
    expect(copy).toHaveLength(2);
    expect(copy[0].name).toMatch(/copy/);

    expect(copy[0].markdown).toBe(tailored);

    fireEvent.click(screen.getByRole('button', { name: 'Delete: Acme · Fullstack' }));
    const deleted = setVariants.mock.calls[1][0]([variant()]);
    expect(deleted).toHaveLength(0);
  });

  it('keeps its tail out of the way when there is no file to link', () => {
    renderPanel({
      localFile: { ...noFile, supported: false },
    });
    expect(screen.queryByRole('button', { name: /Link a \.md file/ })).toBe(null);
    expect(screen.getByText(/cannot write to a file directly/)).toBeTruthy();
  });

  it('links the file once and then writes to it, naming the file it writes to', () => {
    const localFile = { ...noFile };
    localFile.link = vi.fn();
    const { rerender } = render(
      <VariantsPanel
        markdown={BASE}
        variants={[]}
        setVariants={vi.fn()}
        activeVariantId={null}
        onOpenVariant={vi.fn()}
        onSaveCurrent={vi.fn()}
        t={t}
        localFile={localFile}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: /Link a \.md file/ }));
    expect(localFile.link).toHaveBeenCalled();

    const linked = { ...localFile, isLinked: true, fileName: 'cv.md', status: 'saved' };
    rerender(
      <VariantsPanel
        markdown={BASE}
        variants={[]}
        setVariants={vi.fn()}
        activeVariantId={null}
        onOpenVariant={vi.fn()}
        onSaveCurrent={vi.fn()}
        t={t}
        localFile={linked}
      />,
    );
    expect(screen.getByText('cv.md')).toBeTruthy();
    expect(screen.getByText('saved')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: /Write to the file/ }));
    expect(linked.save).toHaveBeenCalledWith(BASE);
  });

  it('says when the file on disk is behind what is on screen', () => {
    renderPanel({
      localFile: { ...noFile, isLinked: true, fileName: 'cv.md', status: 'dirty' },
    });
    expect(screen.getByText(/unsaved changes/)).toBeTruthy();
  });

  it('explains that nothing is uploaded, because that is the whole point', () => {
    renderPanel();
    expect(screen.getByText(/Nothing is uploaded/)).toBeTruthy();
  });
});
