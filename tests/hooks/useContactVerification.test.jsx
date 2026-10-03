import { describe, it, expect, beforeEach } from 'vitest';
import { act, render, screen } from '@testing-library/react';
import React from 'react';
import useContactVerification from '../../src/hooks/useContactVerification';
import ConfirmDialog from '../../src/components/ConfirmDialog';

const CV = 'ana@mail.com | +34 600 123 456 | linkedin.com/in/ana';

function Probe({ markdown, onState }) {
  const state = useContactVerification(markdown);
  onState(state);
  return (
    <ul>
      {state.items.map((item) => (
        <li key={item.id}>
          <span>{item.value}</span>
          <button type="button" onClick={() => state.mark(item.id)}>
            verify {item.value}
          </button>
        </li>
      ))}
      <li data-testid="counts">
        {state.pending.length}/{state.items.length}
      </li>
      <li data-testid="warning">{String(state.hasWarning)}</li>
    </ul>
  );
}

describe('useContactVerification', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('unblocks the export once every item is verified', () => {
    let state;
    render(
      <Probe
        markdown={CV}
        onState={(value) => {
          state = value;
        }}
      />,
    );

    expect(state.pending).toHaveLength(3);
    expect(state.hasWarning).toBe(true);

    act(() => {
      state.items.forEach((item) => state.mark(item.id));
    });

    expect(state.pending).toHaveLength(0);
    expect(state.checked).toBe(3);
    expect(state.done).toBe(true);
    expect(state.hasWarning).toBe(false);
  });

  it('shares the same ticks between two components', () => {
    let first;
    let second;
    render(
      <>
        <Probe
          markdown={CV}
          onState={(value) => {
            first = value;
          }}
        />
        <Probe
          markdown={CV}
          onState={(value) => {
            second = value;
          }}
        />
      </>,
    );

    act(() => {
      first.mark(first.items[0].id);
    });


    expect(second.pending).toHaveLength(2);
    expect(second.checked).toBe(1);
  });

  it('starts the whole check over on checkAgain', () => {
    let state;
    render(
      <Probe
        markdown={CV}
        onState={(value) => {
          state = value;
        }}
      />,
    );

    act(() => {
      state.items.forEach((item) => state.mark(item.id));
    });
    act(() => {
      state.ignore(state.items[0].id);
    });
    act(() => {
      state.checkAgain();
    });

    expect(state.checked).toBe(0);
    expect(state.pending).toHaveLength(3);
    expect(JSON.parse(window.localStorage.getItem('downcv_contact_verified'))).toEqual({});
    expect(JSON.parse(window.localStorage.getItem('downcv_contact_dismissed'))).toEqual({});
  });
});

describe('ConfirmDialog', () => {
  it('blocks the action and can send the user to the check', () => {
    const onConfirm = vi.fn();
    const onCancel = vi.fn();
    render(
      <ConfirmDialog
        open
        title="Verify your contact data first"
        message="3 pending."
        confirmLabel="Check the data"
        cancelLabel="Cancel"
        onConfirm={onConfirm}
        onCancel={onCancel}
      />,
    );

    expect(screen.getByRole('alertdialog')).toBeTruthy();
    act(() => {
      screen.getByText('Check the data').click();
    });
    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(onCancel).not.toHaveBeenCalled();
  });

  it('renders nothing while it is closed', () => {
    render(<ConfirmDialog open={false} title="x" onConfirm={() => {}} onCancel={() => {}} />);
    expect(screen.queryByRole('alertdialog')).toBeNull();
  });
});
