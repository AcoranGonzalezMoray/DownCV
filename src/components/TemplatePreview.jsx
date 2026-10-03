import React from 'react';

const WIDTH = 96;
const HEIGHT = 128;

const FONT = {
  sans: "'Inter', system-ui, sans-serif",
  serif: "Georgia, 'Times New Roman', serif",
  mono: "'JetBrains Mono', ui-monospace, monospace",
};

function HeadingRule({ style, color, x, y, width, height }) {
  const line = (offset, thickness) => (
    <rect x={x} y={y + offset} width={width} height={thickness} fill={color} rx={thickness / 2} />
  );
  if (style === 'line') {
    return line(0, 1.4);
  }
  if (style === 'double') {
    return (
      <>
        {line(0, 0.8)}
        {line(2, 0.8)}
      </>
    );
  }
  if (style === 'minimal') {
    return line(0, 0.6);
  }
  if (style === 'thick-left') {
    return <rect x={x} y={y - 1} width={2.4} height={height + 2} fill={color} />;
  }

  return <rect x={x} y={y - 1.5} width={width * 0.62} height={height} fill={color} rx={1.5} />;
}

export default function TemplatePreview({ template, blocks = 7 }) {
  const { styles, family, density } = template;
  const color = styles.primaryColor;
  const soft = `${color}55`;
  const faint = `${color}2e`;

  const padX = 6 + styles.marginX / 8;
  const padY = 6 + styles.marginY / 8;
  const inner = WIDTH - padX * 2;
  const gap = 5 + styles.sectionGap / 4;
  const line = Math.max(1.6, 2.4 - styles.fontSize / 12);
  const font = FONT[family] || FONT.sans;
  const lines = Math.max(3, Math.round(blocks * density + 2));
  const accent = styles.bulletStyle === '•' ? '•' : styles.bulletStyle === '-' ? '–' : '▸';

  let y = padY;
  const rows = [];

  rows.push(
    <rect
      key="name"
      x={padX}
      y={y}
      width={inner * 0.6}
      height={line * 2.1}
      rx={1.6}
      fill={color}
    />,
  );
  y += line * 3.4;
  rows.push(
    <rect key="role" x={padX} y={y} width={inner * 0.4} height={line * 1.3} rx={1.1} fill={soft} />,
  );
  y += line * 3;

  [0, 1].forEach((section) => {
    if (y > HEIGHT - padY - 14) {
      return;
    }
    const heading = Math.max(1.4, line * 1.25);
    rows.push(
      <g key={`h${section}`}>
        {styles.borderStyle === 'badge' ? (
          <rect x={padX} y={y} width={inner * 0.62} height={heading + 2} rx={1.5} fill={color} />
        ) : (
          <rect x={padX} y={y} width={inner * 0.3} height={heading} rx={1} fill={color} />
        )}
      </g>,
    );
    y += heading + 3;
    if (styles.borderStyle !== 'badge') {
      rows.push(
        <HeadingRule
          key={`r${section}`}
          style={styles.borderStyle}
          color={color}
          x={padX}
          y={y}
          width={inner}
          height={heading}
        />,
      );
      y += 4;
    }

    const perSection = Math.max(2, Math.round(lines / 2));
    for (let index = 0; index < perSection; index += 1) {
      if (y > HEIGHT - padY - 2) {
        return;
      }
      rows.push(
        <g key={`b${section}-${index}`}>
          <circle cx={padX + 1.4} cy={y + line / 2} r={1.1} fill={soft} />
          <text x={padX + 4.5} y={y + line} fontSize={line * 2.1} fill={faint} fontFamily={font}>
            {accent}
          </text>
          <rect
            x={padX + 7}
            y={y}
            width={inner * (0.92 - ((index * 17) % 30) / 100)}
            height={line}
            rx={line / 2}
            fill={soft}
          />
        </g>,
      );
      y += line + 2;
    }
    y += gap;
  });

  return (
    <svg
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      className="w-full h-full"
      role="presentation"
      aria-hidden="true"
      focusable="false"
    >
      <rect x="0" y="0" width={WIDTH} height={HEIGHT} fill="#ffffff" />
      {rows}
    </svg>
  );
}
