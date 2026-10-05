import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import ConfirmDialog from '../../src/components/ConfirmDialog';

const props = (overrides = {}) => ({
  open: true,
  title: 'Verify your contact data first',
  message: '3 pending.',
  confirmLabel: 'Check the data',
  cancelLabel: 'Cancel',
  onConfirm: vi.fn(),
  onCancel: vi.fn(),
  ...overrides,
});

const renderDialog = (overrides = {}) => {
  const all = props(overrides);
  render(<ConfirmDialog {...all} />);
  return all;
};

describe('ConfirmDialog', () => {
  afterEach(() => cleanup());

  it('renders nothing while it is closed', () => {
    const { container } = render(<ConfirmDialog {...props({ open: false })} />);
    expect(container.firstChild).toBe(null);
  });

  it('confirms and cancels through the buttons', () => {
    const { onConfirm, onCancel } = renderDialog();
    fireEvent.click(screen.getByRole('button', { name: 'Check the data' }));
    fireEvent.click(screen.getByText('Cancel'));
    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('cancels through the X button', () => {
    const all = props();
    const { container } = render(<ConfirmDialog {...all} />);
    fireEvent.click(container.querySelector('button[aria-label="Cancel"]'));
    expect(all.onCancel).toHaveBeenCalled();
  });

  it('cancels when the backdrop is pressed', () => {
    const all = props();
    const { container } = render(<ConfirmDialog {...all} />);
    fireEvent.click(container.querySelector('div.absolute.inset-0'));
    expect(all.onCancel).toHaveBeenCalledTimes(1);
  });

  it('cancels with the Escape key', () => {
    const { onCancel } = renderDialog();
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('ignores other keys', () => {
    const { onCancel } = renderDialog();
    fireEvent.keyDown(document, { key: 'Enter' });
    expect(onCancel).not.toHaveBeenCalled();
  });

  it('shows the detail only when there is one', () => {
    const { container, unmount } = render(
      <ConfirmDialog {...props({ detail: 'ana@mail.com looks wrong' })} />,
    );
    expect(container.textContent).toContain('ana@mail.com looks wrong');
    unmount();
    const plain = render(<ConfirmDialog {...props()} />);
    expect(plain.container.textContent).not.toContain('ana@mail.com looks wrong');
  });

  it('paints the warning tone in amber and any other tone in accent', () => {
    const { container, unmount } = render(<ConfirmDialog {...props({ tone: 'warning' })} />);
    expect(container.innerHTML).toMatch(/amber/);
    unmount();
    cleanup();
    const calm = render(<ConfirmDialog {...props({ tone: 'info' })} />);
    expect(calm.container.innerHTML).toMatch(/accent/);
    expect(calm.container.innerHTML).not.toMatch(/amber-500/);
  });
});
