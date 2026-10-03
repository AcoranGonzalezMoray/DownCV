import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import React from 'react';
import PageThumbnails from '../../src/components/PageThumbnails';

const label = 'Pages of the CV';

describe('PageThumbnails', () => {
  afterEach(() => cleanup());

  it('draws no rail for a CV that fits on one sheet', () => {

    render(<PageThumbnails pages={[[0, 1, 2]]} activePage={0} onSelect={vi.fn()} label={label} />);
    expect(screen.queryByRole('navigation')).toBe(null);
  });

  it('draws no rail when there is nothing to draw', () => {
    render(<PageThumbnails pages={[]} activePage={0} onSelect={vi.fn()} label={label} />);
    expect(screen.queryByRole('navigation')).toBe(null);
  });

  it('draws one thumbnail per sheet, numbered against the total', () => {
    render(
      <PageThumbnails
        pages={[[0], [1, 2], [3, 4, 5]]}
        activePage={1}
        onSelect={vi.fn()}
        label={label}
      />,
    );
    const items = screen.getAllByRole('listitem');
    expect(items).toHaveLength(3);
    expect(items[0].textContent).toBe('1/3');
    expect(items[2].textContent).toBe('3/3');
  });

  it('says which sheet the reader is looking at', () => {
    render(
      <PageThumbnails pages={[[0], [1, 2]]} activePage={1} onSelect={vi.fn()} label={label} />,
    );
    const current = screen.getByRole('button', { current: 'page' });
    expect(current.textContent).toContain('2');
  });

  it('takes the reader to the sheet they pick', () => {
    const onSelect = vi.fn();
    render(
      <PageThumbnails pages={[[0], [1], [2]]} activePage={0} onSelect={onSelect} label={label} />,
    );
    fireEvent.click(screen.getAllByRole('listitem')[2].querySelector('button'));
    expect(onSelect).toHaveBeenCalledWith(2);
  });

  it('draws a shape that grows with the sheet, so a full page looks full', () => {
    const { container } = render(
      <PageThumbnails
        pages={[[0], [1, 2, 3, 4, 5, 6]]}
        activePage={0}
        onSelect={vi.fn()}
        label={label}
      />,
    );
    const [sparse, full] = Array.from(container.querySelectorAll('svg'));
    expect(full.querySelectorAll('rect').length).toBeGreaterThan(
      sparse.querySelectorAll('rect').length,
    );
  });
});
