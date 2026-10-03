import React from 'react';

const WIDTH = 64;
const HEIGHT = 90;

function ThumbnailPage({ blocks, active, index, total, label, onSelect }) {
  const padX = 7;
  const padY = 8;
  const inner = WIDTH - padX * 2;
  const rows = [];
  let y = padY;

  rows.push(
    <rect
      key="name"
      x={padX}
      y={y}
      width={inner * 0.62}
      height={4.6}
      rx={2.3}
      fill="currentColor"
    />,
  );
  y += 8.4;
  rows.push(
    <rect
      key="role"
      x={padX}
      y={y}
      width={inner * 0.4}
      height={2.6}
      rx={1.3}
      fill="currentColor"
      opacity="0.45"
    />,
  );
  y += 8;

  blocks.forEach((_, position) => {
    if (y > HEIGHT - padY - 6) {
      return;
    }
    const heading = position % 3 === 0;
    rows.push(
      <g key={`h${position}`}>
        <rect
          x={padX}
          y={y}
          width={inner * (heading ? 0.34 : 0.2)}
          height={heading ? 2.6 : 2.2}
          rx={1.1}
          fill="currentColor"
          opacity={heading ? 0.95 : 0.4}
        />
        {heading && (
          <rect x={padX} y={y + 4.2} width={inner} height={0.7} fill="currentColor" opacity="0.5" />
        )}
      </g>,
    );
    y += heading ? 11 : 6.4;
  });

  return (
    <li>
      <button
        type="button"
        onClick={() => onSelect(index)}
        aria-current={active ? 'page' : undefined}
        title={label}
        className={`group flex w-full flex-col items-center gap-1 rounded-lg px-1 py-1.5 transition ${
          active
            ? 'bg-[var(--ui-accent-muted)] ring-1 ring-[var(--ui-accent)]'
            : 'hover:bg-[var(--ui-bg-card-hover)]'
        }`}
      >
        <svg
          viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
          className={`h-auto w-full rounded-[3px] border bg-white shadow-sm transition ${
            active ? 'border-[var(--ui-accent)]' : 'border-[var(--ui-border-primary)]'
          }`}
          role="presentation"
          aria-hidden="true"
        >
          {rows}
        </svg>
        <span
          className={`font-mono text-[10px] leading-none transition ${
            active ? 'text-[var(--ui-accent)]' : 'text-[var(--ui-text-muted)]'
          }`}
        >
          {index + 1}
          <span className="opacity-50">/{total}</span>
        </span>
      </button>
    </li>
  );
}

export default function PageThumbnails({ pages, activePage, onSelect, label }) {
  if (!pages || pages.length <= 1) {
    return null;
  }
  return (
    <nav
      aria-label={label}
      className="no-print flex w-16 shrink-0 flex-col gap-1 overflow-y-auto border-r border-[var(--ui-border-primary)] bg-[var(--ui-bg-secondary)] px-1.5 py-3"
    >
      <ul className="flex flex-col gap-1 text-[var(--ui-text-tertiary)]">
        {pages.map((page, index) => (
          <ThumbnailPage
            key={index}
            blocks={page}
            index={index}
            total={pages.length}
            active={index === activePage}
            onSelect={onSelect}
            label={label}
          />
        ))}
      </ul>
    </nav>
  );
}
