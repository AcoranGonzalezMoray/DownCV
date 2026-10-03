import React from 'react';
import { Radar as RadarIcon, ListChecks, AlertTriangle } from 'lucide-react';
import { dimensionAdvice, scoreDimensions } from '../utils/atsDimensions';

const SIZE = 150;
const CENTER = SIZE / 2;
const RADIUS = 52;

const AXIS = ['structure', 'contact', 'verbs', 'metrics', 'keywords'];

function polygonPoints(values) {
  return values
    .map((value, index) => {
      const angle = -Math.PI / 2 + (index * 2 * Math.PI) / values.length;
      const distance = RADIUS * Math.min(1, Math.max(0, value / 100));
      return `${(CENTER + Math.cos(angle) * distance).toFixed(1)},${(CENTER + Math.sin(angle) * distance).toFixed(1)}`;
    })
    .join(' ');
}

function axisPoints(count) {
  return Array.from({ length: count }, (_, index) => {
    const angle = -Math.PI / 2 + (index * 2 * Math.PI) / count;
    return {
      x: CENTER + Math.cos(angle) * RADIUS,
      y: CENTER + Math.sin(angle) * RADIUS,
      labelX: CENTER + Math.cos(angle) * (RADIUS + 11),
      labelY: CENTER + Math.sin(angle) * (RADIUS + 11),
    };
  });
}

function Radar({ dimensions, labels }) {
  const axes = axisPoints(AXIS.length);
  const values = dimensions.map((entry) => entry.percent);
  return (
    <svg
      viewBox={`0 0 ${SIZE} ${SIZE}`}
      className="mx-auto h-[150px] w-[150px]"
      role="img"
      aria-label={labels.aria}
    >
      {[0.25, 0.5, 0.75, 1].map((ring) => (
        <polygon
          key={ring}
          points={polygonPoints(AXIS.map(() => ring * 100))}
          fill="none"
          stroke="var(--ui-border-primary)"
          strokeWidth="0.75"
        />
      ))}
      {axes.map((axis, index) => (
        <line
          key={index}
          x1={CENTER}
          y1={CENTER}
          x2={axis.x}
          y2={axis.y}
          stroke="var(--ui-border-primary)"
          strokeWidth="0.75"
        />
      ))}
      <polygon
        points={polygonPoints(values)}
        fill="var(--ui-accent-muted)"
        stroke="var(--ui-accent)"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      {values.map((value, index) => {
        const angle = -Math.PI / 2 + (index * 2 * Math.PI) / values.length;
        const distance = RADIUS * Math.min(1, Math.max(0, value / 100));
        return (
          <circle
            key={index}
            cx={CENTER + Math.cos(angle) * distance}
            cy={CENTER + Math.sin(angle) * distance}
            r="2.5"
            fill="var(--ui-accent)"
          />
        );
      })}
    </svg>
  );
}

const barTone = (percent) => {
  if (percent >= 85) {
    return 'bg-emerald-500';
  }
  if (percent >= 60) {
    return 'bg-amber-500';
  }
  return 'bg-red-500';
};

export default function ScoreBreakdown({ checks, t, lang = 'en' }) {
  if (!Array.isArray(checks) || checks.length === 0) {
    return null;
  }
  const dimensions = scoreDimensions(checks);
  const weakest = dimensions.reduce((worst, entry) =>
    worst === null || entry.lost > worst.lost ? entry : worst,
  );

  return (
    <section className="space-y-3 rounded-xl border border-[var(--ui-border-primary)] bg-[var(--ui-bg-primary)] p-3">
      <h3 className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-[var(--ui-text-tertiary)]">
        <RadarIcon className="w-3.5 h-3.5 text-[var(--ui-accent)]" /> {t.atsPdfBreakdown}
      </h3>

      <Radar dimensions={dimensions} labels={{ aria: t.atsPdfBreakdown }} />

      <ul className="space-y-2">
        {dimensions.map((entry) => (
          <li key={entry.id}>
            <div className="flex items-baseline justify-between gap-2 text-[11px]">
              <span className="font-medium text-[var(--ui-text-primary)]">
                {t[`atsDim${entry.id.charAt(0).toUpperCase()}${entry.id.slice(1)}`]}
              </span>
              <span className="shrink-0 font-mono text-[var(--ui-text-secondary)]">
                {entry.percent}%
                <span className="ml-1 text-[10px] text-[var(--ui-text-muted)]">
                  ({entry.points}/{entry.max})
                </span>
              </span>
            </div>
            <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-[var(--ui-bg-tertiary)]">
              <div
                className={`h-full rounded-full ${barTone(entry.percent)}`}
                style={{ width: `${Math.max(2, entry.percent)}%` }}
              />
            </div>
            {entry.lost > 0 && (
              <p className="mt-1 flex items-start gap-1 text-[10px] leading-relaxed text-[var(--ui-text-tertiary)]">
                <AlertTriangle className="mt-px w-2.5 h-2.5 shrink-0 text-amber-400" />
                {dimensionAdvice(entry.id, lang)}
              </p>
            )}
          </li>
        ))}
      </ul>

      {weakest && weakest.lost > 0 && (
        <p className="flex items-start gap-1.5 border-t border-[var(--ui-border-primary)] pt-2 text-[11px] leading-relaxed text-[var(--ui-text-secondary)]">
          <ListChecks className="mt-px w-3 h-3 shrink-0 text-[var(--ui-accent)]" />
          {t.atsPdfWeakest.replace(
            '{name}',
            t[`atsDim${weakest.id.charAt(0).toUpperCase()}${weakest.id.slice(1)}`],
          )}
        </p>
      )}
    </section>
  );
}
