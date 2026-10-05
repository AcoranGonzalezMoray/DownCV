import { useState } from 'react';
import { Sparkles, X, PlugZap, Check, AlertTriangle, Loader2 } from 'lucide-react';
import { callAIEndpoint } from '../utils/aiEnhancer';

export default function AIAssistantModal({ open, onClose, settings, onSettingsChange, lang }) {
  const [testState, setTestState] = useState({ status: 'idle', message: '' });

  if (!open) {
    return null;
  }

  const es = lang === 'es';
  const set = (patch) => onSettingsChange({ ...settings, ...patch });

  const field =
    'app-input w-full text-xs p-1.5 rounded border border-[var(--ui-border-primary)] bg-[var(--ui-bg-input)] text-[var(--ui-text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--ui-accent)] font-mono';

  const testConnection = async () => {
    setTestState({ status: 'testing', message: '' });
    try {
      const answer = await callAIEndpoint({
        prompt: 'Reply with the single word: ok',
        endpoint: settings.endpoint,
        apiKey: settings.apiKey,
        model: settings.model,
      });
      if (!String(answer || '').trim()) {
        throw new Error(es ? 'respuesta vacía' : 'empty answer');
      }
      setTestState({
        status: 'ok',
        message: es ? 'El modelo respondió.' : 'The model answered.',
      });
    } catch (err) {
      setTestState({ status: 'error', message: `Error: ${err.message}` });
    }
  };

  return (
    <div className="fixed inset-0 z-[100] no-print flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-[2px]" onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={es ? 'Asistente IA' : 'AI Assistant'}
        className="relative w-full max-w-md rounded-xl border border-[var(--ui-border-primary)] bg-[var(--ui-bg-card)] shadow-2xl p-4 space-y-4 max-h-[90vh] overflow-y-auto"
      >
        <div className="flex items-start gap-2">
          <span className="p-1.5 rounded-lg shrink-0 bg-[var(--ui-accent-muted)] text-[var(--ui-accent)]">
            <Sparkles className="w-4 h-4" />
          </span>
          <div className="flex-1">
            <h2 className="text-sm font-semibold text-[var(--ui-text-primary)]">
              {es ? 'Asistente IA' : 'AI Assistant'}
            </h2>
            <p className="text-[11px] text-[var(--ui-text-tertiary)] leading-relaxed">
              {es
                ? 'Reescritura privada en la vista previa, con tu propio modelo local.'
                : 'Private rewriting in the preview, with your own local model.'}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={es ? 'Cerrar' : 'Close'}
            className="p-0.5 text-[var(--ui-text-tertiary)] hover:text-[var(--ui-text-primary)]"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        <button
          type="button"
          role="switch"
          aria-checked={Boolean(settings.enabled)}
          aria-label={es ? 'Activar IA en la vista previa' : 'Enable AI in the preview'}
          onClick={() => set({ enabled: !settings.enabled })}
          className="flex w-full items-center gap-3 rounded-lg border border-[var(--ui-border-primary)] bg-[var(--ui-bg-primary)] px-3 py-2.5 text-left transition hover:border-[var(--ui-accent)]/50"
        >
          <span
            aria-hidden="true"
            className={`relative h-5 w-9 shrink-0 rounded-full transition ${
              settings.enabled ? 'bg-[var(--ui-accent)]' : 'bg-[var(--ui-bg-tertiary)]'
            }`}
          >
            <span
              className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all ${
                settings.enabled ? 'left-[18px]' : 'left-0.5'
              }`}
            />
          </span>
          <span className="min-w-0">
            <span className="block text-xs font-semibold text-[var(--ui-text-primary)]">
              {es ? 'Activar IA en la vista previa' : 'Enable AI in the preview'}
            </span>
            <span className="block text-[10px] leading-relaxed text-[var(--ui-text-tertiary)]">
              {es
                ? 'Muestra un botón junto a «Reordenar secciones» cuando hay texto seleccionado.'
                : 'Shows a button next to “Reorder sections” while text is selected.'}
            </span>
          </span>
        </button>

        <div className="space-y-2">
          <label className="block space-y-1">
            <span className="text-[10px] uppercase tracking-wide text-[var(--ui-text-muted)]">
              Endpoint URL
            </span>
            <input
              value={settings.endpoint}
              onChange={(event) => set({ endpoint: event.target.value })}
              placeholder="http://localhost:11434/v1/chat/completions"
              spellCheck={false}
              className={field}
            />
          </label>
          <div className="grid grid-cols-2 gap-2">
            <label className="block space-y-1">
              <span className="text-[10px] uppercase tracking-wide text-[var(--ui-text-muted)]">
                Model
              </span>
              <input
                value={settings.model}
                onChange={(event) => set({ model: event.target.value })}
                placeholder="llama3"
                spellCheck={false}
                className={field}
              />
            </label>
            <label className="block space-y-1">
              <span className="text-[10px] uppercase tracking-wide text-[var(--ui-text-muted)]">
                API Key
              </span>
              <input
                type="password"
                value={settings.apiKey}
                onChange={(event) => set({ apiKey: event.target.value })}
                placeholder="Bearer token..."
                className={field}
              />
            </label>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={testConnection}
            disabled={testState.status === 'testing'}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-medium border border-[var(--ui-border-primary)] text-[var(--ui-text-secondary)] transition hover:border-[var(--ui-accent)]/50 hover:text-[var(--ui-text-primary)] disabled:opacity-50"
          >
            {testState.status === 'testing' ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                {es ? 'Comprobando…' : 'Checking…'}
              </>
            ) : (
              <>
                <PlugZap className="w-3.5 h-3.5" />
                {es ? 'Probar conexión' : 'Test connection'}
              </>
            )}
          </button>
          {testState.status === 'ok' && (
            <p className="flex items-center gap-1 text-[11px] text-emerald-400">
              <Check className="w-3.5 h-3.5" /> {testState.message}
            </p>
          )}
          {testState.status === 'error' && (
            <p className="flex items-center gap-1 text-[11px] text-red-400">
              <AlertTriangle className="w-3.5 h-3.5 shrink-0" /> {testState.message}
            </p>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 pt-1">
          <button
            type="button"
            onClick={onClose}
            className="px-2.5 py-1.5 rounded-lg text-[11px] font-medium bg-[var(--ui-accent)] hover:bg-[var(--ui-accent-hover)] text-[var(--ui-text-inverse)] transition"
          >
            {es ? 'Listo' : 'Done'}
          </button>
        </div>
      </div>
    </div>
  );
}
