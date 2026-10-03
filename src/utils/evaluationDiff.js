const lcsTable = (a, b) => {
  const table = Array.from({ length: a.length + 1 }, () => new Array(b.length + 1).fill(0));
  for (let i = a.length - 1; i >= 0; i -= 1) {
    for (let j = b.length - 1; j >= 0; j -= 1) {
      table[i][j] =
        a[i] === b[j] ? table[i + 1][j + 1] + 1 : Math.max(table[i + 1][j], table[i][j + 1]);
    }
  }
  return table;
};

export function diffLines(before, after) {
  const a = String(before || '').split('\n');
  const b = String(after || '').split('\n');
  const table = lcsTable(a, b);
  const result = [];
  let i = 0;
  let j = 0;

  const push = (type, text) => {
    const last = result[result.length - 1];
    if (last && last.type === type) {
      last.text += `\n${text}`;
    } else {
      result.push({ type, text });
    }
  };

  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) {
      push('same', a[i]);
      i += 1;
      j += 1;
    } else if (table[i + 1][j] >= table[i][j + 1]) {
      push('removed', a[i]);
      i += 1;
    } else {
      push('added', b[j]);
      j += 1;
    }
  }
  while (i < a.length) {
    push('removed', a[i]);
    i += 1;
  }
  while (j < b.length) {
    push('added', b[j]);
    j += 1;
  }
  return result;
}

export function diffStats(before, after) {
  const changes = diffLines(before, after);
  let added = 0;
  let removed = 0;
  for (const change of changes) {
    const lines = change.text.split('\n').length;
    if (change.type === 'added') {
      added += lines;
    }
    if (change.type === 'removed') {
      removed += lines;
    }
  }
  return { added, removed, changed: added + removed > 0 };
}

export function scoreTrend(history) {
  const points = (history || [])
    .slice()
    .reverse()
    .map((record) => ({ score: record.score, createdAt: record.createdAt, id: record.id }));
  if (points.length < 2) {
    return { points, delta: 0, direction: 'flat' };
  }
  const delta = points[points.length - 1].score - points[0].score;
  return { points, delta, direction: delta > 0 ? 'up' : delta < 0 ? 'down' : 'flat' };
}
