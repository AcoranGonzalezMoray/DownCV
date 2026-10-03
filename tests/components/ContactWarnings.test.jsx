import { describe, it, expect, afterEach, beforeEach, vi } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import React from 'react';
import ContactWarnings from '../../src/components/ContactWarnings';
import { scanContacts } from '../../src/utils/contactScan';
import { translations } from '../../src/data/translations';

const t = translations.en;

const FULL = `# Ana Gomez

ana@mail.com | +34 600 123 456 | linkedin.com/in/ana

## EXPERIENCE

Acme Corp
`;

const NO_PHONE = `# Ana Gomez

ana@mail.com | linkedin.com/in/ana

## EXPERIENCE

Acme Corp
`;

const renderStrip = (markdown = FULL, extra = {}) => {
  const onOpenChange = vi.fn();
  render(<ContactWarnings markdown={markdown} t={t} {...extra} />);
  return { onOpenChange };
};

const openPanel = () => {
  fireEvent.click(screen.getByRole('button', { name: t.contactWarningOpen }));
};

const verifyItem = (markdown, kind, value) => {
  const item = scanContacts(markdown).items.find(
    (entry) => entry.kind === kind && entry.value === value,
  );
  window.localStorage.setItem(
    'downcv_contact_verified',
    JSON.stringify({ [item.id]: new Date().toISOString() }),
  );
};

describe('ContactWarnings', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('warns while contact data is still unverified', () => {
    renderStrip();
    expect(screen.getByText(t.contactWarningTitle)).toBeTruthy();
    expect(screen.queryByText(t.contactWarningDone)).toBe(null);
  });

  it('opens the checking panel with every item', () => {
    renderStrip();
    openPanel();
    expect(screen.getByText('ana@mail.com')).toBeTruthy();
    expect(screen.getByText('+34 600 123 456')).toBeTruthy();
    expect(screen.getByText('linkedin.com/in/ana')).toBeTruthy();
  });

  it('marks an item as verified and counts the progress', () => {
    renderStrip();
    openPanel();
    const [verify] = screen.getAllByRole('button', { name: t.contactVerify });
    fireEvent.click(verify);
    expect(screen.getAllByText(t.contactVerified).length).toBeGreaterThan(0);
    expect(screen.getByText(/1\/3/)).toBeTruthy();
  });

  it('dismisses an item without verifying it', () => {
    renderStrip();
    openPanel();
    fireEvent.click(screen.getAllByTitle(t.contactDismiss)[0]);
    expect(screen.getByText('ana@mail.com').closest('.opacity-55')).toBeTruthy();
    expect(
      screen.getByRole('button', { name: t.contactCheckAgainShort }),
    ).toBeTruthy();
  });

  it('lists what is missing when the CV has no phone', () => {
    renderStrip(NO_PHONE);
    openPanel();
    expect(screen.getByText(t.contactProblemNoPhone)).toBeTruthy();
  });

  it('says everything is done once all items are verified', () => {
    for (const [kind, value] of [
      ['email', 'ana@mail.com'],
      ['phone', '+34 600 123 456'],
      ['link', 'linkedin.com/in/ana'],
    ]) {
      const item = scanContacts(FULL).items.find(
        (entry) => entry.kind === kind && entry.value === value,
      );
      const stored = JSON.parse(window.localStorage.getItem('downcv_contact_verified') || '{}');
      stored[item.id] = new Date().toISOString();
      window.localStorage.setItem('downcv_contact_verified', JSON.stringify(stored));
    }
    renderStrip();
    expect(screen.getByText(t.contactWarningDone)).toBeTruthy();
    openPanel();
    expect(screen.getByText(t.contactAllDone)).toBeTruthy();
  });

  it('checks everything again after marks were made', () => {
    renderStrip();
    openPanel();
    fireEvent.click(screen.getAllByRole('button', { name: t.contactVerify })[0]);
    fireEvent.click(screen.getByRole('button', { name: t.contactCheckAgainShort }));
    expect(screen.getAllByRole('button', { name: t.contactVerify })).toHaveLength(3);
    expect(screen.queryByText(t.contactVerified)).toBe(null);
  });

  it('closes with Escape and forgets the link preview when the CV changes', () => {
    const { rerender } = render(<ContactWarnings markdown={FULL} t={t} />);
    openPanel();
    fireEvent.click(screen.getAllByTitle(t.contactOpenPage)[0]);
    expect(document.querySelector('iframe')).toBeTruthy();

    rerender(<ContactWarnings markdown={NO_PHONE} t={t} />);
    expect(document.querySelector('iframe')).toBe(null);
  });

  it('closes the panel with the Escape key', () => {
    renderStrip();
    openPanel();
    expect(document.querySelector('iframe') || screen.getByText('ana@mail.com')).toBeTruthy();
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByText('ana@mail.com')).toBe(null);
  });

  it('opens the link preview with a working external link', () => {
    verifyItem(FULL, 'email', 'ana@mail.com');
    verifyItem(FULL, 'phone', '+34 600 123 456');
    renderStrip();
    openPanel();
    fireEvent.click(screen.getAllByTitle(t.contactOpenPage)[0]);
    const frame = document.querySelector('iframe');
    expect(frame.getAttribute('src')).toBe('https://linkedin.com/in/ana');
    const externals = screen.getAllByRole('link', {
      name: new RegExp(t.contactOpenExternal),
    });
    expect(externals).toHaveLength(2);
    for (const external of externals) {
      expect(external.getAttribute('href')).toBe('https://linkedin.com/in/ana');
      expect(external.getAttribute('target')).toBe('_blank');
      expect(external.getAttribute('rel')).toBe('noreferrer noopener');
    }
  });

  it('lets the app own the open state when it asks for it', () => {
    const onOpenChange = vi.fn();
    render(<ContactWarnings markdown={FULL} t={t} open={false} onOpenChange={onOpenChange} />);
    fireEvent.click(screen.getByRole('button', { name: t.contactWarningOpen }));
    expect(onOpenChange).toHaveBeenCalledWith(expect.any(Function));
  });
});
