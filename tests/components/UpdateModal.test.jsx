import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, screen, cleanup, fireEvent, act } from '@testing-library/react';
import UpdateModal from '../../src/components/UpdateModal';
import { translations } from '../../src/data/translations';
import { UPDATE_COMMAND } from '../../src/data/versionInfo';

const t = translations.en;

const info = {
  status: 'behind',
  aheadBy: 2,
  behindBy: 0,
  compareUrl: 'https://github.com/AcoranGonzalezMoray/DownCV/compare/aaa...main',
  commits: [
    { sha: 'aaaaaaa', message: 'Fix the ATS parser', author: 'Acora', date: '' },
    { sha: 'bbbbbbb', message: 'Add docker support', author: 'Acora', date: '' },
  ],
};

const renderModal = (props = {}) => {
  const handlers = { onDismiss: vi.fn(), onUpdate: vi.fn() };
  const view = render(
    <UpdateModal
      open
      onDismiss={handlers.onDismiss}
      onUpdate={handlers.onUpdate}
      info={info}
      currentSha="aaa1111"
      isDev={false}
      isUpdating={false}
      isChecking={false}
      error=""
      t={t}
      {...props}
    />,
  );
  return { ...handlers, view };
};

describe('UpdateModal', () => {
  afterEach(() => cleanup());

  it('draws nothing when it is closed', () => {
    renderModal({ open: false });
    expect(screen.queryByRole('dialog')).toBe(null);
  });

  it('counts the pending commits and lists their titles', () => {
    renderModal();
    expect(screen.getByRole('dialog')).toBeTruthy();
    expect(screen.getByText((_, node) => node?.textContent?.trim() === 'You are 2 commits behind main')).toBeTruthy();
    expect(info.aheadBy).toBe(2);
    expect(screen.getByText('Fix the ATS parser')).toBeTruthy();
    expect(screen.getByText('Add docker support')).toBeTruthy();
    expect(screen.getByText('aaaaaaa · Acora')).toBeTruthy();
  });

  it('shows the running commit next to main', () => {
    renderModal({ currentSha: '' });
    expect(screen.getByText('—')).toBeTruthy();
    expect(screen.getByText('main')).toBeTruthy();
  });

  it('confirms the update once there is nothing left to pull', () => {
    const { onDismiss } = renderModal({
      info: { status: 'current', aheadBy: 0, behindBy: 0, commits: [] },
      resolved: { previousCount: 2 },
    });
    expect(screen.getByText(t.updateResolvedTitle)).toBeTruthy();
    const dialog = screen.getByRole('dialog');
    expect(dialog.textContent).toContain(
      `You had 2 pending from main. ${t.updateResolvedNow}`,
    );
    expect(screen.queryByText(t.updateBadge)).toBe(null);
    expect(screen.queryByText(t.updateNow)).toBe(null);

    fireEvent.click(screen.getAllByRole('button', { name: t.updateResolvedClose })[0]);
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it('drops the pending count when there was never one', () => {
    renderModal({ info: { status: 'current', aheadBy: 0, behindBy: 0, commits: [] }, resolved: { previousCount: 0 } });
    expect(screen.getByText(t.updateResolvedNow)).toBeTruthy();
  });

  it('closes on skip, on the close button and on Escape', () => {
    const { onDismiss } = renderModal();
    const buttons = screen.getAllByRole('button', { name: t.updateDismiss });
    fireEvent.click(buttons[0]);
    expect(onDismiss).toHaveBeenCalledTimes(1);

    fireEvent.click(buttons[1]);
    expect(onDismiss).toHaveBeenCalledTimes(2);

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onDismiss).toHaveBeenCalledTimes(3);
  });

  it('links to the compare view on GitHub without leaking the instance URL', () => {
    renderModal();
    const links = screen.getAllByRole('link').filter((a) => a.href === info.compareUrl);
    expect(links.length).toBeGreaterThan(0);
    for (const link of links) {
      expect(link.rel).toContain('noreferrer');
      expect(link.getAttribute('referrerpolicy')).toBe('no-referrer');
    }
  });

  it('falls back to a compare URL built from the running commit', () => {
    renderModal({ info: { ...info, compareUrl: '' } });
    const link = screen.getAllByRole('link')[0];
    expect(link.href).toBe('https://github.com/AcoranGonzalezMoray/DownCV/compare/aaa1111...main');
  });

  it('gives Docker users a copyable command and no misleading update button', async () => {
    renderModal();
    expect(screen.getByText(UPDATE_COMMAND)).toBeTruthy();
    expect(screen.queryByText(t.updateNow)).toBe(null);
    expect(screen.getAllByRole('link').every((a) => a.href === info.compareUrl)).toBe(true);

    const copy = screen.getByRole('button', { name: t.updateCopyCommand });
    const writeText = vi.fn(async () => { });
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });

    // Copying awaits the clipboard, so the tick that shows the check lands after the click.
    await act(async () => {
      fireEvent.click(copy);
    });

    expect(writeText).toHaveBeenCalledWith(UPDATE_COMMAND);
    expect(copy.querySelector('.lucide-check')).toBeTruthy();
  });

  it('leaves the copy button alone when the clipboard refuses', async () => {
    renderModal();
    const copy = screen.getByRole('button', { name: t.updateCopyCommand });
    Object.defineProperty(navigator, 'clipboard', {
      value: {
        writeText: vi.fn(async () => {
          throw new Error('denied');
        }),
      },
      configurable: true,
    });

    await act(async () => {
      fireEvent.click(copy);
    });

    expect(copy.querySelector('.lucide-check')).toBe(null);
  });

  it('runs the pull through the dev server when running locally', () => {
    const { onUpdate } = renderModal({ isDev: true });
    expect(screen.queryByText(UPDATE_COMMAND)).toBe(null);

    const update = screen.getAllByRole('button', { name: t.updateNow })[0];
    fireEvent.click(update);
    expect(onUpdate).toHaveBeenCalledTimes(1);
  });

  it('blocks the update button while the pull is already running', () => {
    renderModal({ isDev: true, isUpdating: true });
    const update = screen.getAllByRole('button', { name: t.updateNow })[0];
    expect(update.disabled).toBe(true);
  });

  it('surfaces a failed pull in dev', () => {
    renderModal({ isDev: true, error: 'Hay cambios locales sin commitear' });
    expect(screen.getByText('Hay cambios locales sin commitear')).toBeTruthy();
  });

  it('never shows the error box outside dev', () => {
    renderModal({ error: 'boom' });
    expect(screen.queryByText('boom')).toBe(null);
  });
});