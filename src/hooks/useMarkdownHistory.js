import { useCallback, useRef, useState } from 'react';

const LIMIT = 100;
const MERGE_WINDOW = 700;

export default function useMarkdownHistory(initialValue) {
  const [markdown, setValue] = useState(initialValue);
  const [state, setState] = useState({ canUndo: false, canRedo: false });
  const current = useRef(initialValue);
  const past = useRef([]);
  const future = useRef([]);
  const lastEdit = useRef(0);

  const setMarkdown = useCallback((next, merge = false) => {
    const resolved = typeof next === 'function' ? next(current.current) : next;
    if (resolved === current.current) {
      return;
    }
    const now = Date.now();
    const coalesce = merge && past.current.length > 0 && now - lastEdit.current < MERGE_WINDOW;
    if (!coalesce) {
      past.current = [...past.current.slice(-(LIMIT - 1)), current.current];
    }
    future.current = [];
    lastEdit.current = now;
    current.current = resolved;
    setValue(resolved);
    setState({ canUndo: true, canRedo: false });
  }, []);

  const undo = useCallback(() => {
    if (past.current.length === 0) {
      return;
    }
    const previous = past.current[past.current.length - 1];
    past.current = past.current.slice(0, -1);
    future.current = [...future.current, current.current];
    current.current = previous;
    lastEdit.current = 0;
    setValue(previous);
    setState({ canUndo: past.current.length > 0, canRedo: true });
  }, []);

  const redo = useCallback(() => {
    if (future.current.length === 0) {
      return;
    }
    const next = future.current[future.current.length - 1];
    future.current = future.current.slice(0, -1);
    past.current = [...past.current.slice(-(LIMIT - 1)), current.current];
    current.current = next;
    lastEdit.current = 0;
    setValue(next);
    setState({ canUndo: true, canRedo: future.current.length > 0 });
  }, []);

  return { markdown, setMarkdown, undo, redo, canUndo: state.canUndo, canRedo: state.canRedo };
}
