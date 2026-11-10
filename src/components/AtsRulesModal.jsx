import { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  Check,
  CheckCircle2,
  Download,
  FileJson,
  Info,
  Pencil,
  Plus,
  ShieldCheck,
  SlidersHorizontal,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import { BASE_RULE_LABEL_KEYS, CHECK_POINTS } from '../utils/atsBaseRules';
import { DIMENSION_GROUPS, DIMENSION_IDS } from '../utils/atsDimensions';
import {
  CUSTOM_RULE_TYPES,
  activeCustomPoints,
  createGroup,
  createRule,
  defaultRuleParams,
  exportRuleGroups,
  mergeImportedGroups,
  parseRuleGroups,
  validateGroup,
  validateRule,
} from '../utils/atsCustomRules';

const DIMENSION_LABEL_KEYS = {
  structure: 'atsDimStructure',
  contact: 'atsDimContact',
  verbs: 'atsDimVerbs',
  metrics: 'atsDimMetrics',
  keywords: 'atsDimKeywords',
};

const TYPE_LABEL_KEYS = {
  containsAny: 'atsRulesTypeContainsAny',
  containsAll: 'atsRulesTypeContainsAll',
  notContains: 'atsRulesTypeNotContains',
  minCount: 'atsRulesTypeMinCount',
  maxCount: 'atsRulesTypeMaxCount',
  wordCountRange: 'atsRulesTypeWordCountRange',
  regex: 'atsRulesTypeRegex',
  notRegex: 'atsRulesTypeNotRegex',
};

const TYPE_EXAMPLE_KEYS = {
  containsAny: 'atsRulesExampleContainsAny',
  containsAll: 'atsRulesExampleContainsAll',
  notContains: 'atsRulesExampleNotContains',
  minCount: 'atsRulesExampleMinCount',
  maxCount: 'atsRulesExampleMaxCount',
  wordCountRange: 'atsRulesExampleWordCountRange',
  regex: 'atsRulesExampleRegex',
  notRegex: 'atsRulesExampleNotRegex',
};

const TERM_TYPES = new Set(['containsAny', 'containsAll', 'notContains']);
const REGEX_TYPES = new Set(['regex', 'notRegex']);

const clone = (value) => JSON.parse(JSON.stringify(value));

const fieldClass =
  'w-full rounded-lg border border-[var(--ui-border-primary)] bg-[var(--ui-bg-input)] px-2 py-1.5 text-xs text-[var(--ui-text-primary)] focus:border-[var(--ui-accent)] focus:outline-none';
const labelClass =
  'block text-[10px] font-semibold uppercase tracking-wider text-[var(--ui-text-tertiary)]';
const buttonClass =
  'inline-flex items-center justify-center gap-1.5 rounded-lg border border-[var(--ui-border-primary)] px-2.5 py-1.5 text-xs font-medium text-[var(--ui-text-secondary)] transition hover:border-[var(--ui-accent)]/50 hover:text-[var(--ui-text-primary)] disabled:opacity-50';
const primaryButtonClass =
  'inline-flex items-center justify-center gap-1.5 rounded-lg border border-[var(--ui-accent)]/40 bg-[var(--ui-accent-muted)] px-2.5 py-1.5 text-xs font-semibold text-[var(--ui-accent)] transition hover:bg-[var(--ui-accent)]/15 disabled:opacity-50';

function errorText(error, t) {
  switch (error) {
    case 'name':
      return t.atsRulesValidationGroupName;
    case 'description':
      return t.atsRulesValidationGroupDescription;
    case 'title':
      return t.atsRulesValidationTitle;
    case 'failMessage':
      return t.atsRulesValidationFailMessage;
    case 'passMessage':
      return t.atsRulesValidationPassMessage;
    case 'terms':
      return t.atsRulesValidationTerms;
    case 'term':
      return t.atsRulesValidationTerm;
    case 'min':
      return t.atsRulesValidationMin;
    case 'max':
      return t.atsRulesValidationMax;
    case 'points':
      return t.atsRulesValidationPoints;
    case 'pattern':
      return t.atsRulesValidationPattern;
    case 'type':
      return t.atsRulesRuleType;
    case 'dimension':
      return t.atsRulesRuleDimension;
    default:
      return t.atsRulesRequired;
  }
}

function NoticeStack({ notices, onDismiss, t }) {
  if (notices.length === 0) {
    return null;
  }

  return (
    <div
      className="pointer-events-none absolute right-3 top-[6.5rem] z-30 flex w-96 max-w-[calc(100%-1.5rem)] flex-col gap-1.5"
      data-testid="ats-rules-notices"
    >
      {notices.map((notice) => {
        const isError = notice.tone === 'error';
        return (
          <div
            key={notice.id}
            role={isError ? 'alert' : 'status'}
            data-testid="ats-rules-notice"
            className={`pointer-events-auto flex items-start gap-2 rounded-lg border bg-[var(--ui-bg-card)] px-2.5 py-2 text-[11px] shadow-lg ${
              isError ? 'border-red-500/40 text-red-400' : 'border-emerald-500/40 text-emerald-400'
            }`}
          >
            {isError ? (
              <AlertTriangle className="mt-px h-3.5 w-3.5 shrink-0" />
            ) : (
              <CheckCircle2 className="mt-px h-3.5 w-3.5 shrink-0" />
            )}
            <span className="min-w-0 flex-1 leading-relaxed">{notice.text}</span>
            <button
              type="button"
              onClick={() => onDismiss(notice.id)}
              aria-label={t.atsRulesDismiss}
              className="shrink-0 rounded border border-transparent p-0.5 text-[var(--ui-text-muted)] transition hover:border-[var(--ui-border-primary)] hover:text-[var(--ui-text-primary)]"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        );
      })}
    </div>
  );
}

function LanguageTabs({ value, onChange, t }) {
  return (
    <div className="flex rounded-lg bg-[var(--ui-bg-primary)] p-0.5 border border-[var(--ui-border-primary)] text-[11px] font-medium">
      {[
        { id: 'en', label: 'EN' },
        { id: 'es', label: 'ES' },
      ].map((item) => (
        <button
          key={item.id}
          type="button"
          onClick={() => onChange(item.id)}
          aria-pressed={value === item.id}
          className={`flex-1 rounded-md px-2 py-1 transition ${
            value === item.id
              ? 'bg-[var(--ui-accent)] text-[var(--ui-text-inverse)] shadow-sm'
              : 'text-[var(--ui-text-tertiary)] hover:text-[var(--ui-text-primary)]'
          }`}
        >
          {item.label}
          <span className="sr-only"> {t.atsRulesLanguage}</span>
        </button>
      ))}
    </div>
  );
}

function RuleParamsEditor({ draft, onChange, t }) {
  const params = draft.params || {};
  const setParam = (patch) => onChange({ ...draft, params: { ...params, ...patch } });

  if (TERM_TYPES.has(draft.type)) {
    return (
      <label className="block space-y-1">
        <span className={labelClass}>{t.atsRulesTerms}</span>
        <textarea
          rows={3}
          value={(params.terms || []).join('\n')}
          onChange={(event) =>
            setParam({
              terms: event.target.value
                .split('\n')
                .map((term) => term.trim())
                .filter(Boolean),
            })
          }
          placeholder={'docker\nkubernetes\naws'}
          aria-label={t.atsRulesTerms}
          className={`${fieldClass} resize-none font-mono`}
        />
      </label>
    );
  }

  if (draft.type === 'minCount' || draft.type === 'maxCount') {
    const isMin = draft.type === 'minCount';
    return (
      <div className="grid grid-cols-2 gap-2">
        <label className="block space-y-1">
          <span className={labelClass}>{t.atsRulesTerm}</span>
          <input
            type="text"
            value={params.term || ''}
            onChange={(event) => setParam({ term: event.target.value })}
            placeholder="Python"
            aria-label={t.atsRulesTerm}
            className={fieldClass}
          />
        </label>
        <label className="block space-y-1">
          <span className={labelClass}>{isMin ? t.atsRulesMin : t.atsRulesMax}</span>
          <input
            type="number"
            min="0"
            value={params[isMin ? 'min' : 'max'] ?? 0}
            onChange={(event) => setParam({ [isMin ? 'min' : 'max']: Number(event.target.value) })}
            aria-label={isMin ? t.atsRulesMin : t.atsRulesMax}
            className={fieldClass}
          />
        </label>
      </div>
    );
  }

  if (draft.type === 'wordCountRange') {
    return (
      <div className="grid grid-cols-2 gap-2">
        <label className="block space-y-1">
          <span className={labelClass}>{t.atsRulesMin}</span>
          <input
            type="number"
            min="0"
            value={params.min ?? 0}
            onChange={(event) => setParam({ min: Number(event.target.value) })}
            aria-label={t.atsRulesMin}
            className={fieldClass}
          />
        </label>
        <label className="block space-y-1">
          <span className={labelClass}>{t.atsRulesMax}</span>
          <input
            type="number"
            min="0"
            value={params.max ?? 0}
            onChange={(event) => setParam({ max: Number(event.target.value) })}
            aria-label={t.atsRulesMax}
            className={fieldClass}
          />
        </label>
      </div>
    );
  }

  if (REGEX_TYPES.has(draft.type)) {
    return (
      <div className="grid grid-cols-[1fr_5rem] gap-2">
        <label className="block space-y-1">
          <span className={labelClass}>{t.atsRulesPattern}</span>
          <input
            type="text"
            value={params.pattern || ''}
            onChange={(event) => setParam({ pattern: event.target.value })}
            placeholder="\\b(19|20)\\d{2}\\b"
            aria-label={t.atsRulesPattern}
            className={`${fieldClass} font-mono`}
          />
        </label>
        <label className="block space-y-1">
          <span className={labelClass}>{t.atsRulesFlags}</span>
          <input
            type="text"
            value={params.flags ?? 'i'}
            onChange={(event) => setParam({ flags: event.target.value })}
            placeholder="i"
            aria-label={t.atsRulesFlags}
            className={`${fieldClass} font-mono`}
          />
        </label>
      </div>
    );
  }

  return null;
}

function GroupEditor({ editor, editorLang, setEditorLang, onChange, onSave, onCancel, t }) {
  const draft = editor.draft;
  const setLocalized = (field, value) =>
    onChange({ ...draft, [field]: { ...draft[field], [editorLang]: value } });

  return (
    <div className="rounded-xl border border-[var(--ui-accent)]/40 bg-[var(--ui-bg-primary)] p-3 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <h4 className="text-xs font-semibold text-[var(--ui-text-primary)]">
          {t.atsRulesEditGroup}
        </h4>
        <LanguageTabs value={editorLang} onChange={setEditorLang} t={t} />
      </div>

      <label className="block space-y-1">
        <span className={labelClass}>
          {t.atsRulesGroupName}{' '}
          <span aria-hidden="true" className="text-red-400">
            *
          </span>
        </span>
        <input
          type="text"
          value={draft.name?.[editorLang] || ''}
          onChange={(event) => setLocalized('name', event.target.value)}
          aria-required="true"
          aria-label={t.atsRulesGroupName}
          className={fieldClass}
        />
      </label>

      <label className="block space-y-1">
        <span className={labelClass}>
          {t.atsRulesGroupDescription}{' '}
          <span aria-hidden="true" className="text-red-400">
            *
          </span>
        </span>
        <textarea
          rows={2}
          value={draft.description?.[editorLang] || ''}
          onChange={(event) => setLocalized('description', event.target.value)}
          aria-required="true"
          aria-label={t.atsRulesGroupDescription}
          className={`${fieldClass} resize-none`}
        />
      </label>

      <p className="text-[10px] text-[var(--ui-text-tertiary)]">{t.atsRulesRequired}</p>

      <div className="flex justify-end gap-2">
        <button type="button" onClick={onCancel} className={buttonClass}>
          {t.atsRulesCancel}
        </button>
        <button type="button" onClick={onSave} className={primaryButtonClass}>
          <Check className="w-3.5 h-3.5" /> {t.atsRulesSave}
        </button>
      </div>
    </div>
  );
}

function RuleEditor({ editor, editorLang, setEditorLang, onChange, onSave, onCancel, t }) {
  const draft = editor.draft;
  const setLocalized = (field, value) =>
    onChange({ ...draft, [field]: { ...draft[field], [editorLang]: value } });

  return (
    <div className="rounded-xl border border-[var(--ui-accent)]/40 bg-[var(--ui-bg-primary)] p-3 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <h4 className="text-xs font-semibold text-[var(--ui-text-primary)]">
          {t.atsRulesEditRule}
        </h4>
        <LanguageTabs value={editorLang} onChange={setEditorLang} t={t} />
      </div>

      <div className="grid grid-cols-2 gap-2">
        <label className="block space-y-1">
          <span className={labelClass}>{t.atsRulesRuleType}</span>
          <select
            value={draft.type}
            onChange={(event) => {
              const type = event.target.value;
              onChange({ ...draft, type, params: defaultRuleParams(type) });
            }}
            aria-label={t.atsRulesRuleType}
            className={fieldClass}
          >
            {CUSTOM_RULE_TYPES.map((type) => (
              <option key={type} value={type}>
                {t[TYPE_LABEL_KEYS[type]]}
              </option>
            ))}
          </select>
        </label>
        <label className="block space-y-1">
          <span className={labelClass}>{t.atsRulesRulePoints}</span>
          <input
            type="number"
            min="1"
            max="20"
            value={draft.points}
            onChange={(event) => onChange({ ...draft, points: Number(event.target.value) })}
            aria-label={t.atsRulesRulePoints}
            className={fieldClass}
          />
        </label>
      </div>

      <div className="flex items-start gap-2 rounded-lg border border-[var(--ui-border-primary)] bg-[var(--ui-bg-secondary)] px-2.5 py-2 text-[11px] leading-relaxed text-[var(--ui-text-tertiary)]">
        <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[var(--ui-accent)]" />
        <span>
          <span className="font-semibold text-[var(--ui-text-secondary)]">
            {t.atsRulesExampleLabel}:
          </span>{' '}
          <span>{t[TYPE_EXAMPLE_KEYS[draft.type]]}</span>
        </span>
      </div>

      <label className="block space-y-1">
        <span className={labelClass}>{t.atsRulesRuleDimension}</span>
        <select
          value={draft.dimension}
          onChange={(event) => onChange({ ...draft, dimension: event.target.value })}
          aria-label={t.atsRulesRuleDimension}
          className={fieldClass}
        >
          {DIMENSION_IDS.map((id) => (
            <option key={id} value={id}>
              {t[DIMENSION_LABEL_KEYS[id]]}
            </option>
          ))}
        </select>
      </label>

      <RuleParamsEditor draft={draft} onChange={onChange} t={t} />

      <label className="block space-y-1">
        <span className={labelClass}>
          {t.atsRulesRuleTitle}{' '}
          <span aria-hidden="true" className="text-red-400">
            *
          </span>
        </span>
        <input
          type="text"
          value={draft.title?.[editorLang] || ''}
          onChange={(event) => setLocalized('title', event.target.value)}
          aria-required="true"
          aria-label={t.atsRulesRuleTitle}
          className={fieldClass}
        />
      </label>

      <label className="block space-y-1">
        <span className={labelClass}>
          {t.atsRulesPassMessage}{' '}
          <span aria-hidden="true" className="text-red-400">
            *
          </span>
        </span>
        <textarea
          rows={2}
          value={draft.passMessage?.[editorLang] || ''}
          onChange={(event) => setLocalized('passMessage', event.target.value)}
          aria-required="true"
          aria-label={t.atsRulesPassMessage}
          className={`${fieldClass} resize-none`}
        />
      </label>

      <label className="block space-y-1">
        <span className={labelClass}>
          {t.atsRulesFailMessage}{' '}
          <span aria-hidden="true" className="text-red-400">
            *
          </span>
        </span>
        <textarea
          rows={2}
          value={draft.failMessage?.[editorLang] || ''}
          onChange={(event) => setLocalized('failMessage', event.target.value)}
          aria-required="true"
          aria-label={t.atsRulesFailMessage}
          className={`${fieldClass} resize-none`}
        />
      </label>

      <p className="text-[10px] text-[var(--ui-text-tertiary)]">{t.atsRulesRequired}</p>

      <div className="flex justify-end gap-2">
        <button type="button" onClick={onCancel} className={buttonClass}>
          {t.atsRulesCancel}
        </button>
        <button type="button" onClick={onSave} className={primaryButtonClass}>
          <Check className="w-3.5 h-3.5" /> {t.atsRulesSave}
        </button>
      </div>
    </div>
  );
}

export default function AtsRulesModal({ open, onClose, t, lang, groups = [], setGroups }) {
  const [tab, setTab] = useState('base');
  const [editor, setEditor] = useState(null);
  const [editorLang, setEditorLang] = useState(lang === 'es' ? 'es' : 'en');
  const [notices, setNotices] = useState([]);
  const [confirm, setConfirm] = useState(null);
  const [importPreview, setImportPreview] = useState(null);
  const importRef = useRef(null);
  const noticeSeq = useRef(0);

  useEffect(() => {
    if (!open) {
      return undefined;
    }
    const onKey = (event) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  useEffect(() => {
    if (!open) {
      setEditor(null);
      setNotices([]);
      setConfirm(null);
      setImportPreview(null);
    }
  }, [open]);

  const list = Array.isArray(groups) ? groups : [];
  const customPoints = useMemo(() => activeCustomPoints(list), [list]);
  const totalPoints = useMemo(
    () => Object.values(CHECK_POINTS).reduce((total, points) => total + points, 0) + customPoints,
    [customPoints],
  );

  if (!open) {
    return null;
  }

  const nextNoticeId = () => {
    noticeSeq.current += 1;
    return `notice-${noticeSeq.current}`;
  };

  const pushNotice = (text, tone = 'error') => {
    const id = nextNoticeId();
    setNotices((previous) => [...previous, { id, text, tone }]);
  };

  const dismissNotice = (id) =>
    setNotices((previous) => previous.filter((notice) => notice.id !== id));

  const clearValidationNotices = () =>
    setNotices((previous) => previous.filter((notice) => notice.kind !== 'validation'));

  const showValidationErrors = (errors) => {
    const messages = [...new Set(errors.map((error) => errorText(error, t)))];
    const prepared = messages.map((text) => ({
      id: nextNoticeId(),
      text,
      tone: 'error',
      kind: 'validation',
    }));
    setNotices((previous) => [
      ...previous.filter((notice) => notice.kind !== 'validation'),
      ...prepared,
    ]);
  };

  const updateGroup = (groupId, patch) =>
    setGroups((previous) =>
      (previous || []).map((group) => (group.id === groupId ? { ...group, ...patch } : group)),
    );

  const updateRule = (groupId, ruleId, patch) =>
    setGroups((previous) =>
      (previous || []).map((group) =>
        group.id === groupId
          ? {
              ...group,
              rules: (group.rules || []).map((rule) =>
                rule.id === ruleId ? { ...rule, ...patch } : rule,
              ),
            }
          : group,
      ),
    );

  const removeGroup = (groupId) =>
    setGroups((previous) => (previous || []).filter((group) => group.id !== groupId));

  const removeRule = (groupId, ruleId) =>
    setGroups((previous) =>
      (previous || []).map((group) =>
        group.id === groupId
          ? { ...group, rules: (group.rules || []).filter((rule) => rule.id !== ruleId) }
          : group,
      ),
    );

  const openGroupEditor = (group = null) => {
    setTab('custom');
    clearValidationNotices();
    setConfirm(null);
    setEditor({
      kind: 'group',
      groupId: group?.id || null,
      draft: group ? clone(group) : createGroup(),
    });
  };

  const openRuleEditor = (groupId, rule = null) => {
    setTab('custom');
    clearValidationNotices();
    setConfirm(null);
    setEditor({
      kind: 'rule',
      groupId,
      draft: rule ? clone(rule) : createRule(),
    });
  };

  const saveEditor = () => {
    if (!editor) {
      return;
    }
    if (editor.kind === 'group') {
      const result = validateGroup(editor.draft);
      if (!result.ok) {
        showValidationErrors(result.errors);
        return;
      }
      setGroups((previous) => {
        const current = previous || [];
        return current.some((group) => group.id === result.value.id)
          ? current.map((group) => (group.id === result.value.id ? result.value : group))
          : [...current, result.value];
      });
    } else {
      const result = validateRule(editor.draft);
      if (!result.ok) {
        showValidationErrors(result.errors);
        return;
      }
      setGroups((previous) =>
        (previous || []).map((group) => {
          if (group.id !== editor.groupId) {
            return group;
          }
          const rules = group.rules || [];
          return {
            ...group,
            rules: rules.some((rule) => rule.id === result.value.id)
              ? rules.map((rule) => (rule.id === result.value.id ? result.value : rule))
              : [...rules, result.value],
          };
        }),
      );
    }
    setEditor(null);
    clearValidationNotices();
  };

  const handleExport = () => {
    const data = exportRuleGroups(list);
    try {
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'downcv-ats-rules.json';
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      pushNotice(t.atsRulesExportDone, 'success');
    } catch (_error) {
      pushNotice(t.atsRulesExportError, 'error');
    }
  };

  const handleImportFile = async (file) => {
    if (!file) {
      return;
    }
    setImportPreview(null);
    try {
      const text = await file.text();
      const parsed = parseRuleGroups(text);
      setImportPreview({ groups: parsed, fileName: file.name || '' });
    } catch (error) {
      pushNotice(
        error?.message === 'invalid-schema' ? t.atsRulesSchema : t.atsRulesImportError,
        'error',
      );
    }
  };

  const applyImport = (replace) => {
    if (!importPreview) {
      return;
    }
    setGroups((previous) => mergeImportedGroups(previous || [], importPreview.groups, { replace }));
    pushNotice(t.atsRulesImported.replace('{n}', String(importPreview.groups.length)), 'success');
    setImportPreview(null);
    if (importRef.current) {
      importRef.current.value = '';
    }
  };

  return (
    <div
      className="fixed inset-0 z-[100] no-print flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="ats-rules-modal-title"
    >
      <div className="fixed inset-0" onClick={onClose} aria-hidden="true" />

      <div className="relative w-full max-w-3xl max-h-[92vh] flex flex-col rounded-2xl border border-[var(--ui-border-primary)] bg-[var(--ui-bg-card)] shadow-2xl overflow-hidden z-10">
        <header className="flex items-center justify-between gap-3 border-b border-[var(--ui-border-primary)] bg-[var(--ui-bg-secondary)] px-4 py-3 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-[var(--ui-border-primary)] bg-[var(--ui-bg-primary)]">
              <ShieldCheck className="w-4 h-4 text-[var(--ui-accent)]" />
            </div>
            <div className="min-w-0">
              <h2
                id="ats-rules-modal-title"
                className="text-sm font-bold tracking-tight text-[var(--ui-text-primary)]"
              >
                {t.atsRulesTitle}
              </h2>
              <p className="text-[11px] leading-snug text-[var(--ui-text-tertiary)]">
                {t.atsRulesIntro}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={t.atsRulesClose}
            className="shrink-0 rounded-lg border border-[var(--ui-border-primary)] p-1.5 text-[var(--ui-text-tertiary)] transition hover:text-[var(--ui-text-primary)]"
          >
            <X className="w-4 h-4" />
          </button>
        </header>

        <div className="shrink-0 border-b border-[var(--ui-border-primary)] bg-[var(--ui-bg-secondary)] px-4 py-2">
          <div className="flex rounded-lg border border-[var(--ui-border-primary)] bg-[var(--ui-bg-primary)] p-0.5 text-xs font-medium">
            {[
              { id: 'base', label: t.atsRulesBaseTab, Icon: ShieldCheck },
              { id: 'custom', label: t.atsRulesCustomTab, Icon: SlidersHorizontal },
            ].map((item) => {
              const active = tab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setTab(item.id)}
                  aria-pressed={active}
                  className={`flex flex-1 items-center justify-center gap-1.5 rounded-md px-2 py-1.5 transition ${
                    active
                      ? 'bg-[var(--ui-accent)] text-[var(--ui-text-inverse)] shadow-sm'
                      : 'text-[var(--ui-text-tertiary)] hover:text-[var(--ui-text-primary)]'
                  }`}
                >
                  <item.Icon className="h-3.5 w-3.5" />
                  {item.label}
                </button>
              );
            })}
          </div>
        </div>

        <NoticeStack notices={notices} onDismiss={dismissNotice} t={t} />

        <div className="min-h-0 flex-1 overflow-y-auto p-4 space-y-4">
          {tab === 'base' ? (
            <div className="space-y-4">
              <div className="rounded-xl border border-[var(--ui-border-primary)] bg-[var(--ui-bg-primary)] p-3">
                <h3 className="text-xs font-semibold text-[var(--ui-text-primary)]">
                  {t.atsRulesBaseTitle}
                </h3>
                <p className="mt-1 text-[11px] leading-relaxed text-[var(--ui-text-tertiary)]">
                  {t.atsRulesBaseIntro} {t.atsRulesBaseReadOnly}
                </p>
              </div>

              {DIMENSION_IDS.map((dimension) => (
                <section key={dimension} className="space-y-1.5">
                  <h4 className="text-[10px] font-semibold uppercase tracking-wider text-[var(--ui-text-tertiary)]">
                    {t[DIMENSION_LABEL_KEYS[dimension]]}
                  </h4>
                  <ul className="space-y-1">
                    {DIMENSION_GROUPS[dimension].map((id) => (
                      <li
                        key={id}
                        className="flex items-center justify-between gap-3 rounded-lg border border-[var(--ui-border-primary)] bg-[var(--ui-bg-primary)] px-2.5 py-1.5"
                      >
                        <span className="min-w-0 truncate text-xs text-[var(--ui-text-secondary)]">
                          {t[BASE_RULE_LABEL_KEYS[id]] || id}
                        </span>
                        <span className="flex shrink-0 items-center gap-2 text-[10px] text-[var(--ui-text-tertiary)]">
                          <span className="font-mono">
                            {CHECK_POINTS[id]} {t.atsRulesPoints}
                          </span>
                          <span className="rounded bg-[var(--ui-bg-badge)] px-1.5 py-0.5 font-mono uppercase tracking-wider">
                            {t.atsRulesPermanent}
                          </span>
                        </span>
                      </li>
                    ))}
                  </ul>
                </section>
              ))}
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="text-[11px] text-[var(--ui-text-tertiary)]">
                  <span className="font-semibold text-[var(--ui-text-secondary)]">
                    {t.atsRulesCustomPoints}:
                  </span>{' '}
                  <span className="font-mono">{customPoints}</span>
                  <span className="mx-2">·</span>
                  <span className="font-semibold text-[var(--ui-text-secondary)]">
                    {t.atsRulesTotalPoints}:
                  </span>{' '}
                  <span className="font-mono">{totalPoints}</span>
                </div>
                <div className="flex flex-wrap items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => openGroupEditor()}
                    className={primaryButtonClass}
                  >
                    <Plus className="w-3.5 h-3.5" /> {t.atsRulesAddGroup}
                  </button>
                  <button
                    type="button"
                    onClick={handleExport}
                    disabled={list.length === 0}
                    className={buttonClass}
                  >
                    <Download className="w-3.5 h-3.5" /> {t.atsRulesExport}
                  </button>
                  <button
                    type="button"
                    onClick={() => importRef.current?.click()}
                    className={buttonClass}
                  >
                    <Upload className="w-3.5 h-3.5" /> {t.atsRulesImport}
                  </button>
                  <input
                    type="file"
                    ref={importRef}
                    accept=".json,application/json"
                    className="hidden"
                    onChange={(event) => {
                      const [file] = event.target.files || [];
                      handleImportFile(file);
                    }}
                  />
                </div>
              </div>

              {importPreview && (
                <div className="rounded-xl border border-[var(--ui-accent)]/40 bg-[var(--ui-bg-primary)] p-3 space-y-2">
                  <div className="flex items-start gap-2">
                    <FileJson className="w-4 h-4 mt-0.5 shrink-0 text-[var(--ui-accent)]" />
                    <div className="min-w-0 text-[11px]">
                      <p className="font-semibold text-[var(--ui-text-primary)]">
                        {t.atsRulesImportReady.replace('{n}', String(importPreview.groups.length))}
                      </p>
                      {importPreview.fileName && (
                        <p className="truncate font-mono text-[10px] text-[var(--ui-text-tertiary)]">
                          {importPreview.fileName}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-wrap justify-end gap-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        setImportPreview(null);
                        if (importRef.current) {
                          importRef.current.value = '';
                        }
                      }}
                      className={buttonClass}
                    >
                      {t.atsRulesCancel}
                    </button>
                    <button
                      type="button"
                      onClick={() => applyImport(false)}
                      className={buttonClass}
                    >
                      {t.atsRulesImportAppend}
                    </button>
                    <button
                      type="button"
                      onClick={() => applyImport(true)}
                      className={primaryButtonClass}
                    >
                      {t.atsRulesImportReplace}
                    </button>
                  </div>
                </div>
              )}

              {editor?.kind === 'group' && !editor.groupId && (
                <GroupEditor
                  editor={editor}
                  editorLang={editorLang}
                  setEditorLang={setEditorLang}
                  onChange={(draft) => setEditor({ ...editor, draft })}
                  onSave={saveEditor}
                  onCancel={() => {
                    setEditor(null);
                    clearValidationNotices();
                  }}
                  t={t}
                />
              )}

              {list.length === 0 ? (
                <p className="rounded-xl border border-dashed border-[var(--ui-border-primary)] px-3 py-6 text-center text-[11px] text-[var(--ui-text-tertiary)]">
                  {t.atsRulesEmpty}
                </p>
              ) : (
                <ul className="space-y-2">
                  {list.map((group) => {
                    const rules = group.rules || [];
                    const name = group.name?.[lang] || group.name?.en || t.atsRulesUntitled;
                    return (
                      <li
                        key={group.id}
                        className={`rounded-xl border border-[var(--ui-border-primary)] bg-[var(--ui-bg-primary)] p-2.5 space-y-2 ${
                          group.enabled === false ? 'opacity-60' : ''
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <label className="flex min-w-0 items-start gap-2">
                            <input
                              type="checkbox"
                              checked={group.enabled !== false}
                              onChange={(event) =>
                                updateGroup(group.id, { enabled: event.target.checked })
                              }
                              aria-label={t.atsRulesEnableGroup}
                              className="mt-0.5 accent-[var(--ui-accent)]"
                            />
                            <span className="min-w-0">
                              <span className="block truncate text-xs font-semibold text-[var(--ui-text-primary)]">
                                {name}
                              </span>
                              <span className="block text-[10px] text-[var(--ui-text-tertiary)]">
                                {rules.length} {t.atsRulesRuleCount}
                                {group.description?.[lang] || group.description?.en
                                  ? ` · ${group.description[lang] || group.description.en}`
                                  : ''}
                              </span>
                            </span>
                          </label>
                          <div className="flex shrink-0 items-center gap-1">
                            <button
                              type="button"
                              onClick={() => openGroupEditor(group)}
                              aria-label={t.atsRulesEditGroup}
                              title={t.atsRulesEditGroup}
                              className="rounded border border-[var(--ui-border-primary)] p-1 text-[var(--ui-text-tertiary)] transition hover:text-[var(--ui-text-primary)]"
                            >
                              <Pencil className="w-3 h-3" />
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                setConfirm({ kind: 'group', groupId: group.id, ruleId: null })
                              }
                              aria-label={t.atsRulesDeleteGroup}
                              title={t.atsRulesDeleteGroup}
                              className="rounded border border-[var(--ui-border-primary)] p-1 text-[var(--ui-text-tertiary)] transition hover:text-red-400"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        </div>

                        {editor?.kind === 'group' && editor.groupId === group.id && (
                          <GroupEditor
                            editor={editor}
                            editorLang={editorLang}
                            setEditorLang={setEditorLang}
                            onChange={(draft) => setEditor({ ...editor, draft })}
                            onSave={saveEditor}
                            onCancel={() => {
                              setEditor(null);
                              clearValidationNotices();
                            }}
                            t={t}
                          />
                        )}

                        {confirm?.kind === 'group' && confirm.groupId === group.id && (
                          <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-red-500/30 bg-red-500/10 px-2 py-1.5">
                            <span className="text-[11px] text-red-400">
                              {t.atsRulesConfirmDelete} {t.atsRulesConfirmDeleteDetail}
                            </span>
                            <div className="flex gap-1.5">
                              <button
                                type="button"
                                onClick={() => setConfirm(null)}
                                className={buttonClass}
                              >
                                {t.atsRulesCancel}
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  removeGroup(group.id);
                                  setConfirm(null);
                                }}
                                className="inline-flex items-center gap-1 rounded-lg border border-red-500/40 bg-red-500/10 px-2 py-1 text-[11px] font-medium text-red-400 transition hover:bg-red-500/20"
                              >
                                <Trash2 className="w-3 h-3" /> {t.atsRulesDelete}
                              </button>
                            </div>
                          </div>
                        )}

                        <ul className="space-y-1">
                          {rules.map((rule) => {
                            const title = rule.title?.[lang] || rule.title?.en || rule.id;
                            const isEditing =
                              editor?.kind === 'rule' &&
                              editor.groupId === group.id &&
                              editor.draft.id === rule.id;
                            return (
                              <li
                                key={rule.id}
                                className={`rounded-lg border border-[var(--ui-border-primary)] bg-[var(--ui-bg-card)] px-2 py-1.5 space-y-1 ${
                                  rule.enabled === false ? 'opacity-60' : ''
                                }`}
                              >
                                <div className="flex items-start justify-between gap-2">
                                  <label className="flex min-w-0 items-start gap-2">
                                    <input
                                      type="checkbox"
                                      checked={rule.enabled !== false}
                                      onChange={(event) =>
                                        updateRule(group.id, rule.id, {
                                          enabled: event.target.checked,
                                        })
                                      }
                                      aria-label={t.atsRulesEnableRule}
                                      className="mt-0.5 accent-[var(--ui-accent)]"
                                    />
                                    <span className="min-w-0">
                                      <span className="block truncate text-[11px] font-medium text-[var(--ui-text-secondary)]">
                                        {title}
                                      </span>
                                      <span className="block text-[10px] text-[var(--ui-text-tertiary)]">
                                        {t[TYPE_LABEL_KEYS[rule.type]] || rule.type} ·{' '}
                                        {t[DIMENSION_LABEL_KEYS[rule.dimension]] || rule.dimension}{' '}
                                        · {rule.points} {t.atsRulesPoints}
                                      </span>
                                    </span>
                                  </label>
                                  <div className="flex shrink-0 items-center gap-1">
                                    <button
                                      type="button"
                                      onClick={() => openRuleEditor(group.id, rule)}
                                      aria-label={t.atsRulesEditRule}
                                      title={t.atsRulesEditRule}
                                      className="rounded border border-[var(--ui-border-primary)] p-1 text-[var(--ui-text-tertiary)] transition hover:text-[var(--ui-text-primary)]"
                                    >
                                      <Pencil className="w-3 h-3" />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() =>
                                        setConfirm({
                                          kind: 'rule',
                                          groupId: group.id,
                                          ruleId: rule.id,
                                        })
                                      }
                                      aria-label={t.atsRulesDeleteRule}
                                      title={t.atsRulesDeleteRule}
                                      className="rounded border border-[var(--ui-border-primary)] p-1 text-[var(--ui-text-tertiary)] transition hover:text-red-400"
                                    >
                                      <Trash2 className="w-3 h-3" />
                                    </button>
                                  </div>
                                </div>

                                {confirm?.kind === 'rule' &&
                                  confirm.groupId === group.id &&
                                  confirm.ruleId === rule.id && (
                                    <div className="flex flex-wrap items-center justify-between gap-2 rounded border border-red-500/30 bg-red-500/10 px-2 py-1.5">
                                      <span className="text-[11px] text-red-400">
                                        {t.atsRulesConfirmDelete} {t.atsRulesConfirmDeleteDetail}
                                      </span>
                                      <div className="flex gap-1.5">
                                        <button
                                          type="button"
                                          onClick={() => setConfirm(null)}
                                          className={buttonClass}
                                        >
                                          {t.atsRulesCancel}
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => {
                                            removeRule(group.id, rule.id);
                                            setConfirm(null);
                                          }}
                                          className="inline-flex items-center gap-1 rounded-lg border border-red-500/40 bg-red-500/10 px-2 py-1 text-[11px] font-medium text-red-400 transition hover:bg-red-500/20"
                                        >
                                          <Trash2 className="w-3 h-3" /> {t.atsRulesDelete}
                                        </button>
                                      </div>
                                    </div>
                                  )}

                                {isEditing && (
                                  <RuleEditor
                                    editor={editor}
                                    editorLang={editorLang}
                                    setEditorLang={setEditorLang}
                                    onChange={(draft) => setEditor({ ...editor, draft })}
                                    onSave={saveEditor}
                                    onCancel={() => {
                                      setEditor(null);
                                      clearValidationNotices();
                                    }}
                                    t={t}
                                  />
                                )}
                              </li>
                            );
                          })}
                        </ul>

                        {editor?.kind === 'rule' &&
                          editor.groupId === group.id &&
                          !rules.some((rule) => rule.id === editor.draft.id) && (
                            <RuleEditor
                              editor={editor}
                              editorLang={editorLang}
                              setEditorLang={setEditorLang}
                              onChange={(draft) => setEditor({ ...editor, draft })}
                              onSave={saveEditor}
                              onCancel={() => {
                                setEditor(null);
                                clearValidationNotices();
                              }}
                              t={t}
                            />
                          )}

                        <button
                          type="button"
                          onClick={() => openRuleEditor(group.id)}
                          className={buttonClass}
                        >
                          <Plus className="w-3.5 h-3.5" /> {t.atsRulesAddRule}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
