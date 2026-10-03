import React, { useState } from 'react';
import {
  GitBranch,
  Plus,
  Trash2,
  Pencil,
  FolderOpen,
  Save,
  Unlink,
  HardDrive,
  Check,
  AlertTriangle,
  Copy,
  ArrowLeftRight,
} from 'lucide-react';
import { createVariant, summarizeVariant, upsertVariant } from '../utils/cvVariants';

const chip =
  'rounded border border-[var(--ui-border-primary)] bg-[var(--ui-bg-primary)] px-1.5 py-0.5 font-mono text-[10px] text-[var(--ui-text-tertiary)]';

function VariantRow({ variant, baseMarkdown, isActive, t, onOpen, onRename, onDelete, onCopy }) {
  const summary = summarizeVariant(variant, baseMarkdown);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(variant.name);

  return (
    <li
      className={`rounded-lg border p-2 transition ${
        isActive
          ? 'border-[var(--ui-accent)] bg-[var(--ui-accent-muted)]'
          : 'border-[var(--ui-border-primary)] bg-[var(--ui-bg-card)]'
      }`}
    >
      <div className="flex items-center gap-1.5">
        {editing ? (
          <input
            autoFocus
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && draft.trim()) {
                onRename(variant.id, draft.trim());
                setEditing(false);
              } else if (event.key === 'Escape') {
                setEditing(false);
              }
            }}
            className="app-input min-w-0 flex-1 rounded border border-[var(--ui-border-primary)] px-1.5 py-0.5 text-[11px]"
          />
        ) : (
          <button
            type="button"
            onClick={() => onOpen(variant.id)}
            className={`min-w-0 flex-1 truncate text-left text-[11px] font-semibold transition ${
              isActive ? 'text-[var(--ui-accent)]' : 'text-[var(--ui-text-primary)]'
            }`}
            title={t.variantsOpen}
          >
            {variant.name}
          </button>
        )}
        <button
          type="button"
          onClick={() => {
            setDraft(variant.name);
            setEditing(true);
          }}
          title={t.variantsRename}
          aria-label={`${t.variantsRename}: ${variant.name}`}
          className="p-0.5 text-[var(--ui-text-muted)] transition hover:text-[var(--ui-accent)]"
        >
          <Pencil className="w-3 h-3" />
        </button>
        <button
          type="button"
          onClick={() => onCopy(variant.id)}
          title={t.variantsDuplicate}
          aria-label={`${t.variantsDuplicate}: ${variant.name}`}
          className="p-0.5 text-[var(--ui-text-muted)] transition hover:text-[var(--ui-accent)]"
        >
          <Copy className="w-3 h-3" />
        </button>
        <button
          type="button"
          onClick={() => onDelete(variant.id)}
          title={t.variantsDelete}
          aria-label={`${t.variantsDelete}: ${variant.name}`}
          className="p-0.5 text-[var(--ui-text-muted)] transition hover:text-red-400"
        >
          <Trash2 className="w-3 h-3" />
        </button>
      </div>

      {summary.added.length > 0 && (
        <p className="mt-1.5 flex flex-wrap items-center gap-1">
          <span className="text-[10px] text-emerald-400">+</span>
          {summary.added.map((word) => (
            <span key={word} className={chip}>
              {word}
            </span>
          ))}
        </p>
      )}
      {summary.removed.length > 0 && (
        <p className="mt-1 flex flex-wrap items-center gap-1">
          <span className="text-[10px] text-red-400">-</span>
          {summary.removed.map((word) => (
            <span key={word} className={`${chip} line-through opacity-70`}>
              {word}
            </span>
          ))}
        </p>
      )}
      {summary.added.length === 0 && summary.removed.length === 0 && (
        <p className="mt-1 text-[10px] italic text-[var(--ui-text-muted)]">
          {t.variantsSameAsBase}
        </p>
      )}
    </li>
  );
}

export default function VariantsPanel({
  markdown,
  variants,
  setVariants,
  activeVariantId,
  onOpenVariant,
  onSaveCurrent,
  t,
  localFile,
}) {
  const [name, setName] = useState('');

  const create = () => {
    const label = name.trim();
    if (!label) {
      return;
    }
    const variant = createVariant({ name: label, markdown, baseId: activeVariantId || null });
    setVariants((previous) => upsertVariant(previous, variant));

    onOpenVariant(variant.id, variant.markdown);
    setName('');
  };

  const rename = (id, next) =>
    setVariants((previous) =>
      previous.map((variant) =>
        variant.id === id
          ? { ...variant, name: next, updatedAt: new Date().toISOString() }
          : variant,
      ),
    );

  const remove = (id) => setVariants((previous) => previous.filter((v) => v.id !== id));

  const duplicate = (id) => {
    const source = variants.find((variant) => variant.id === id);
    if (!source) {
      return;
    }
    const copy = createVariant({
      name: `${source.name} (copy)`,
      markdown: source.markdown,
      baseId: source.id,
    });
    setVariants((previous) => upsertVariant(previous, copy));
  };

  const file = (
    <section className="space-y-2 border-t border-[var(--ui-border-primary)] pt-3">
      <h3 className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-[var(--ui-text-tertiary)]">
        <HardDrive className="w-3.5 h-3.5 text-[var(--ui-accent)]" /> {t.localFileTitle}
      </h3>

      {!localFile.supported ? (
        <p className="flex items-start gap-1.5 rounded border border-[var(--ui-border-primary)] bg-[var(--ui-bg-primary)] p-2 text-[10px] leading-relaxed text-[var(--ui-text-muted)]">
          <AlertTriangle className="mt-px w-3 h-3 shrink-0 text-amber-400" />
          {t.localFileUnsupported}
        </p>
      ) : localFile.isLinked ? (
        <>
          <p className="flex items-center gap-1.5 rounded border border-[var(--ui-accent-border)] bg-[var(--ui-accent-muted)] px-2 py-1.5 text-[11px] text-[var(--ui-accent)]">
            {localFile.status === 'dirty' ? (
              <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-amber-400" />
            ) : (
              <Check className="w-3.5 h-3.5 shrink-0" />
            )}
            <span className="min-w-0 flex-1 truncate font-mono">{localFile.fileName}</span>
            <span className="shrink-0 text-[10px]">
              {localFile.status === 'dirty' ? t.localFileDirty : t.localFileSaved}
            </span>
          </p>
          <div className="flex gap-1.5">
            <button
              type="button"
              onClick={() => localFile.save(markdown)}
              disabled={localFile.busy}
              className="flex flex-1 items-center justify-center gap-1.5 rounded border border-[var(--ui-accent)]/40 bg-[var(--ui-accent-muted)] px-2 py-1.5 text-[11px] font-medium text-[var(--ui-accent)] transition hover:bg-[var(--ui-accent)]/15 disabled:opacity-50"
            >
              <Save className="w-3 h-3" /> {t.localFileSave}
            </button>
            <button
              type="button"
              onClick={localFile.unlink}
              title={t.localFileUnlink}
              aria-label={t.localFileUnlink}
              className="p-1.5 rounded border border-[var(--ui-border-primary)] text-[var(--ui-text-tertiary)] transition hover:text-[var(--ui-text-primary)]"
            >
              <Unlink className="w-3.5 h-3.5" />
            </button>
          </div>
        </>
      ) : (
        <button
          type="button"
          onClick={localFile.link}
          disabled={localFile.busy}
          className="flex w-full items-center justify-center gap-1.5 rounded border border-[var(--ui-border-primary)] bg-[var(--ui-bg-card)] px-2 py-1.5 text-[11px] font-medium text-[var(--ui-text-secondary)] transition hover:border-[var(--ui-accent)] hover:text-[var(--ui-accent)] disabled:opacity-50"
        >
          <FolderOpen className="w-3.5 h-3.5" /> {t.localFileLink}
        </button>
      )}

      <p className="text-[10px] leading-relaxed text-[var(--ui-text-muted)]">{t.localFileHint}</p>
    </section>
  );

  return (
    <div className="h-full space-y-4 overflow-y-auto border-l border-[var(--ui-border-primary)] bg-[var(--ui-bg-secondary)] p-4 text-[var(--ui-text-secondary)] no-print">
      <div className="flex items-center gap-2 border-b border-[var(--ui-border-primary)] pb-3">
        <GitBranch className="w-5 h-5 text-[var(--ui-accent)]" />
        <h2 className="text-sm font-semibold text-[var(--ui-text-primary)]">{t.variantsTitle}</h2>
      </div>

      <p className="text-[11px] leading-relaxed text-[var(--ui-text-tertiary)]">
        {t.variantsIntro}
      </p>

      <div className="flex gap-1.5">
        <input
          type="text"
          value={name}
          onChange={(event) => setName(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              create();
            }
          }}
          placeholder={t.variantsPlaceholder}
          className="app-input min-w-0 flex-1 rounded border border-[var(--ui-border-primary)] px-2 py-1.5 text-[11px]"
        />
        <button
          type="button"
          onClick={create}
          disabled={!name.trim()}
          title={t.variantsCreate}
          aria-label={t.variantsCreate}
          className="shrink-0 rounded bg-[var(--ui-accent)] p-1.5 text-[var(--ui-text-inverse)] transition hover:bg-[var(--ui-accent-hover)] disabled:opacity-40"
        >
          <Plus className="w-3.5 h-3.5" />
        </button>
      </div>

      {variants.length === 0 ? (
        <p className="rounded border border-dashed border-[var(--ui-border-primary)] p-3 text-center text-[11px] text-[var(--ui-text-muted)]">
          {t.variantsEmpty}
        </p>
      ) : (
        <ul className="space-y-1.5">
          {variants.map((variant) => (
            <VariantRow
              key={variant.id}
              variant={variant}
              baseMarkdown={markdown}
              isActive={variant.id === activeVariantId}
              t={t}
              onOpen={onOpenVariant}
              onRename={rename}
              onDelete={remove}
              onCopy={duplicate}
            />
          ))}
        </ul>
      )}

      {activeVariantId && (
        <button
          type="button"
          onClick={() => onSaveCurrent(activeVariantId)}
          className="flex w-full items-center justify-center gap-1.5 rounded border border-[var(--ui-border-primary)] bg-[var(--ui-bg-card)] px-2 py-1.5 text-[11px] text-[var(--ui-text-secondary)] transition hover:border-[var(--ui-accent)] hover:text-[var(--ui-accent)]"
        >
          <ArrowLeftRight className="w-3.5 h-3.5" /> {t.variantsSaveCurrent}
        </button>
      )}

      {file}
    </div>
  );
}
