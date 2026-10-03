import React from 'react';
import { Palette, Type, Sliders, AlignLeft, RotateCcw } from 'lucide-react';
import { LAYOUT_TEMPLATES, applyTemplate, matchTemplate } from '../data/templates';
import TemplatePreview from './TemplatePreview';

const TEMPLATE_NAMES = {
  'ats-classic': { title: 'classicATS', sub: 'classicSub' },
  'modern-executive': { title: 'modernExec', sub: 'execSub' },
  'technical-compact': { title: 'compactTech', sub: 'techSub' },
  'elegant-serif': { title: 'serifPremium', sub: 'serifSub' },
  'creative-split': { title: 'creativeSplit', sub: 'creativeSub' },
  'minimal-clean': { title: 'minimalClean', sub: 'minimalSub' },
};

export default function StyleControls({ styles, setStyles, resetStyles, t }) {
  const fontFamilies = [
    { label: 'Inter (Modern Sans)', value: "'Inter', sans-serif" },
    { label: 'Roboto (ATS Standard)', value: "'Roboto', sans-serif" },
    { label: 'Merriweather (Classic Serif)', value: "'Merriweather', serif" },
    { label: 'Lora (Executive Serif)', value: "'Lora', serif" },
    { label: 'Garamond (Traditional)', value: "'EB Garamond', serif" },
    { label: 'Outfit (Contemporary)', value: "'Outfit', sans-serif" },
    { label: 'JetBrains Mono (Technical)', value: "'JetBrains Mono', monospace" },
  ];

  const colorPresets = [
    { name: 'Slate', color: '#1e293b' },
    { name: 'Navy', color: '#0f172a' },
    { name: 'Cobalt', color: '#1e40af' },
    { name: 'Emerald', color: '#064e3b' },
    { name: 'Burgundy', color: '#881337' },
    { name: 'Charcoal', color: '#111827' },
    { name: 'Teal', color: '#0f766e' },
  ];

  const borderStyles = [
    { label: 'Solid Line', value: 'line' },
    { label: 'Double Line', value: 'double' },
    { label: 'Badge', value: 'badge' },
    { label: 'Minimalist', value: 'minimal' },
    { label: 'Left Border', value: 'thick-left' },
  ];

  const bulletStyles = [
    { label: '• Circle Bullet', value: '•' },
    { label: '- Simple Dash', value: '-' },
    { label: '▸ Minimal Arrow', value: '▸' },
    { label: '✓ Checkmark', value: '✓' },
    { label: '▪ Square', value: '▪' },
  ];

  const activeTemplate = matchTemplate(styles);

  const applyPresetLayout = (type) => setStyles(applyTemplate(styles, type));

  const layoutPresets = LAYOUT_TEMPLATES.map((template) => {
    const names = TEMPLATE_NAMES[template.id] || {};
    return {
      ...template,
      title: t[names.title] || template.id,
      sub: t[names.sub] || template.styles.borderStyle,
      icon: getTemplateIcon(template.id),
    };
  });

  return (
    <div className="h-full space-y-6 overflow-y-auto border-l border-[var(--ui-border-primary)] bg-[var(--ui-bg-secondary)] p-4 text-[var(--ui-text-secondary)] no-print">
      <div className="flex items-center justify-between border-b border-[var(--ui-border-primary)] pb-3">
        <div className="flex items-center gap-2">
          <Palette className="w-5 h-5 text-[var(--ui-accent)]" />
          <h2 className="text-sm font-semibold text-[var(--ui-text-primary)]">
            {t.atsCustomization}
          </h2>
        </div>
        <button
          onClick={resetStyles}
          className="flex items-center gap-1 rounded border border-[var(--ui-border-primary)] bg-[var(--ui-bg-card)] p-1.5 text-xs text-[var(--ui-text-tertiary)] transition hover:bg-[var(--ui-bg-card-hover)] hover:text-[var(--ui-text-primary)]"
        >
          <RotateCcw className="w-3.5 h-3.5" /> {t.reset}
        </button>
      </div>

      <div className="space-y-2">
        <label className="flex items-center gap-1.5 text-xs font-semibold text-[var(--ui-text-tertiary)]">
          <Sliders className="w-3.5 h-3.5 text-[var(--ui-accent)]" /> {t.layoutTemplates}
        </label>
        <div className="grid grid-cols-2 gap-2">
          {layoutPresets.map((preset) => {
            const Icon = preset.icon;
            const isActive = activeTemplate?.id === preset.id;
            return (
              <button
                key={preset.id}
                onClick={() => applyPresetLayout(preset.id)}
                aria-pressed={isActive}
                title={preset.sub}
                className={`group flex flex-col overflow-hidden rounded-lg border text-left transition ${
                  isActive
                    ? 'border-[var(--ui-accent)] ring-1 ring-[var(--ui-accent)]'
                    : 'border-[var(--ui-border-primary)] hover:border-[var(--ui-accent)]'
                }`}
              >
                <span className="block h-28 w-full overflow-hidden border-b border-[var(--ui-border-primary)] bg-white transition group-hover:opacity-95">
                  <TemplatePreview template={preset} />
                </span>
                <span className="block px-2 py-1.5">
                  <span
                    className={`flex items-center gap-1.5 text-[11px] font-semibold ${
                      isActive ? 'text-[var(--ui-accent)]' : 'text-[var(--ui-text-primary)]'
                    }`}
                  >
                    <Icon className="w-3 h-3 shrink-0" /> {preset.title || preset.id}
                  </span>
                  <span className="block truncate text-[10px] text-[var(--ui-text-muted)]">
                    {preset.sub}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
        {activeTemplate === null && (
          <p className="text-[10px] leading-relaxed text-[var(--ui-text-muted)]">
            {t.templatesCustomized}
          </p>
        )}
      </div>

      <div className="space-y-2">
        <label className="flex items-center gap-1.5 text-xs font-semibold text-[var(--ui-text-tertiary)]">
          <Type className="w-3.5 h-3.5 text-[var(--ui-accent)]" /> {t.typographyFont}
        </label>
        <select
          value={styles.fontFamily}
          onChange={(e) => setStyles((prev) => ({ ...prev, fontFamily: e.target.value }))}
          className="w-full rounded border border-[var(--ui-border-primary)] bg-[var(--ui-bg-card)] p-2.5 text-xs text-[var(--ui-text-secondary)] focus:outline-none focus:ring-2 focus:ring-[var(--ui-accent)]"
        >
          {fontFamilies.map((f) => (
            <option key={f.value} value={f.value}>
              {f.label}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-2">
        <label className="flex items-center gap-1.5 text-xs font-semibold text-[var(--ui-text-tertiary)]">
          <Palette className="w-3.5 h-3.5 text-[var(--ui-accent)]" /> {t.accentColor}
        </label>
        <div className="flex flex-wrap items-center gap-2">
          {colorPresets.map((preset) => (
            <button
              key={preset.color}
              onClick={() => setStyles((prev) => ({ ...prev, primaryColor: preset.color }))}
              style={{ backgroundColor: preset.color }}
              className={`h-6 w-6 transform rounded-full border-2 transition hover:scale-110 ${
                styles.primaryColor === preset.color
                  ? 'border-white ring-2 ring-[var(--ui-accent)]'
                  : 'border-transparent opacity-80 hover:opacity-100'
              }`}
              title={preset.name}
            />
          ))}
          <input
            type="color"
            value={styles.primaryColor}
            onChange={(e) => setStyles((prev) => ({ ...prev, primaryColor: e.target.value }))}
            className="h-7 w-7 cursor-pointer rounded border-0 bg-transparent"
            title="Custom color"
          />
        </div>
      </div>

      <div className="space-y-2">
        <label className="flex items-center gap-1.5 text-xs font-semibold text-[var(--ui-text-tertiary)]">
          <AlignLeft className="w-3.5 h-3.5 text-[var(--ui-accent)]" /> {t.headerStyle}
        </label>
        <select
          value={styles.borderStyle}
          onChange={(e) => setStyles((prev) => ({ ...prev, borderStyle: e.target.value }))}
          className="w-full rounded border border-[var(--ui-border-primary)] bg-[var(--ui-bg-card)] p-2.5 text-xs text-[var(--ui-text-secondary)] focus:outline-none focus:ring-2 focus:ring-[var(--ui-accent)]"
        >
          {borderStyles.map((b) => (
            <option key={b.value} value={b.value}>
              {b.label}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-2">
        <label className="text-xs font-semibold text-[var(--ui-text-tertiary)]">
          {t.bulletStyleLabel}
        </label>
        <select
          value={styles.bulletStyle}
          onChange={(e) => setStyles((prev) => ({ ...prev, bulletStyle: e.target.value }))}
          className="w-full rounded border border-[var(--ui-border-primary)] bg-[var(--ui-bg-card)] p-2 text-xs text-[var(--ui-text-secondary)] focus:outline-none focus:ring-2 focus:ring-[var(--ui-accent)]"
        >
          {bulletStyles.map((b) => (
            <option key={b.value} value={b.value}>
              {b.label}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-4 border-t border-[var(--ui-border-primary)] pt-3">
        {[
          { key: 'fontSize', label: t.fontSize, min: 10, max: 16, step: 0.5, unit: 'px' },
          { key: 'lineHeight', label: t.lineHeight, min: 1.2, max: 1.8, step: 0.05, unit: '' },
          {
            key: 'marginY',
            label: t.verticalMargin,
            min: 12,
            max: 48,
            step: 2,
            unit: 'px',
            parseInt: true,
          },
          {
            key: 'marginX',
            label: t.horizontalMargin,
            min: 16,
            max: 52,
            step: 2,
            unit: 'px',
            parseInt: true,
          },
          {
            key: 'sectionGap',
            label: t.sectionGap,
            min: 8,
            max: 32,
            step: 2,
            unit: 'px',
            parseInt: true,
          },
          {
            key: 'itemGap',
            label: t.itemGap,
            min: 4,
            max: 24,
            step: 2,
            unit: 'px',
            parseInt: true,
          },
        ].map((slider) => (
          <div key={slider.key}>
            <div className="mb-1 flex items-center justify-between text-xs font-semibold text-[var(--ui-text-tertiary)]">
              <span className="flex items-center gap-1.5">
                <Sliders className="w-3.5 h-3.5 text-[var(--ui-accent)]" /> {slider.label}
              </span>
              <span className="font-mono text-[var(--ui-accent)]">
                {styles[slider.key]}
                {slider.unit}
              </span>
            </div>
            <input
              type="range"
              min={slider.min}
              max={slider.max}
              step={slider.step}
              value={styles[slider.key]}
              onChange={(e) =>
                setStyles((prev) => ({
                  ...prev,
                  [slider.key]: slider.parseInt
                    ? parseInt(e.target.value)
                    : parseFloat(e.target.value),
                }))
              }
              className="w-full cursor-pointer accent-[var(--ui-accent)]"
            />
          </div>
        ))}
      </div>
    </div>
  );
}

function getTemplateIcon(id) {
  switch (id) {
    case 'ats-classic':
      return Type;
    case 'modern-executive':
      return AlignLeft;
    default:
      return Sliders;
  }
}
