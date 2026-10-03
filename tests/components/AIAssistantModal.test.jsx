import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, screen, cleanup, fireEvent, act } from '@testing-library/react';
import React from 'react';
import AIAssistantModal from '../../src/components/AIAssistantModal';
import { callAIEndpoint } from '../../src/utils/aiEnhancer';

vi.mock('../../src/utils/aiEnhancer', () => ({ callAIEndpoint: vi.fn() }));

const settings = () => ({
  enabled: false,
  endpoint: 'http://localhost:11434/v1/chat/completions',
  model: 'llama3',
  apiKey: '',
});

const renderModal = (overrides = {}) => {
  const onClose = vi.fn();
  const onSettingsChange = vi.fn();
  render(
    <AIAssistantModal
      open
      onClose={onClose}
      settings={settings()}
      onSettingsChange={onSettingsChange}
      lang="en"
      {...overrides}
    />,
  );
  return { onClose, onSettingsChange };
};

describe('AIAssistantModal', () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('renders nothing while it is closed', () => {
    const { container } = render(
      <AIAssistantModal
        open={false}
        onClose={vi.fn()}
        settings={settings()}
        onSettingsChange={vi.fn()}
        lang="en"
      />,
    );
    expect(container.firstChild).toBe(null);
  });

  it('shows the toggle and the endpoint fields', () => {
    renderModal();
    expect(screen.getByRole('switch', { name: /enable ai in the preview/i })).toBeTruthy();
    expect(screen.getByDisplayValue('http://localhost:11434/v1/chat/completions')).toBeTruthy();
    expect(screen.getByDisplayValue('llama3')).toBeTruthy();
  });

  it('flips the toggle through the settings', () => {
    const { onSettingsChange } = renderModal();
    fireEvent.click(screen.getByRole('switch', { name: /enable ai in the preview/i }));
    expect(onSettingsChange).toHaveBeenCalledWith(
      expect.objectContaining({ enabled: true }),
    );
  });

  it('writes the endpoint, model and key through the settings', () => {
    const { onSettingsChange } = renderModal();
    fireEvent.change(screen.getByDisplayValue(/localhost/), {
      target: { value: 'http://server:11434/v1/chat/completions' },
    });
    expect(onSettingsChange).toHaveBeenLastCalledWith(
      expect.objectContaining({ endpoint: 'http://server:11434/v1/chat/completions' }),
    );

    fireEvent.change(screen.getByDisplayValue('llama3'), { target: { value: 'mistral' } });
    expect(onSettingsChange).toHaveBeenLastCalledWith(expect.objectContaining({ model: 'mistral' }));
  });

  it('checks the connection against the configured endpoint', async () => {
    vi.mocked(callAIEndpoint).mockResolvedValue('ok');
    renderModal();
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /test connection/i }));
    });
    expect(callAIEndpoint).toHaveBeenCalledWith(
      expect.objectContaining({
        endpoint: 'http://localhost:11434/v1/chat/completions',
        model: 'llama3',
        apiKey: '',
      }),
    );
    expect(screen.getByText(/the model answered/i)).toBeTruthy();
  });

  it('explains when the endpoint does not answer', async () => {
    vi.mocked(callAIEndpoint).mockRejectedValue(new Error('fetch failed'));
    renderModal();
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /test connection/i }));
    });
    expect(screen.getByText(/fetch failed/)).toBeTruthy();
  });

  it('complains when the endpoint answers with nothing', async () => {
    vi.mocked(callAIEndpoint).mockResolvedValue('   ');
    renderModal();
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /test connection/i }));
    });
    expect(screen.getByText(/^error:/i)).toBeTruthy();
  });

  it('closes through the done button and speaks Spanish', () => {
    const { onClose } = renderModal({ lang: 'es' });
    expect(screen.getByText(/asistente ia/i)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: /^listo$/i }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
