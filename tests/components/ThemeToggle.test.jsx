import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import React from 'react';
import ThemeToggle from '../../src/components/ThemeToggle';

describe('ThemeToggle', () => {
  afterEach(() => cleanup());

  it('offers the light mode while the dark one is on', () => {
    render(<ThemeToggle theme="dark" toggleTheme={vi.fn()} />);
    expect(screen.getByRole('button', { name: /switch to light mode/i })).toBeTruthy();
  });

  it('offers the dark mode while the light one is on', () => {
    render(<ThemeToggle theme="light" toggleTheme={vi.fn()} />);
    expect(screen.getByRole('button', { name: /switch to dark mode/i })).toBeTruthy();
  });

  it('toggles the theme when it is pressed', () => {
    const toggleTheme = vi.fn();
    render(<ThemeToggle theme="dark" toggleTheme={toggleTheme} />);
    fireEvent.click(screen.getByRole('button', { name: /switch to light mode/i }));
    expect(toggleTheme).toHaveBeenCalledTimes(1);
  });
});
