import { useEffect, useCallback } from 'react';

export default function useKeyboardShortcuts({
  onSave,
  onBold,
  onItalic,
  onCommandPalette,
  onPrint,
  onSearch,
  onUndo,
  onRedo,
}) {
  const handler = useCallback(
    (e) => {
      const isCtrl = e.ctrlKey || e.metaKey;
      const isCmdOrCtrl = isCtrl || e.key === '/';

      if (isCmdOrCtrl && e.key === 's') {
        e.preventDefault();
        onSave?.();
      } else if (isCmdOrCtrl && e.key === 'z') {
        e.preventDefault();
        if (e.shiftKey) {
          onRedo?.();
        } else {
          onUndo?.();
        }
      } else if (isCmdOrCtrl && (e.key === 'y' || (e.shiftKey && e.key === 'Z'))) {
        e.preventDefault();
        onRedo?.();
      } else if (isCmdOrCtrl && e.key === 'b') {
        e.preventDefault();
        onBold?.();
      } else if (isCmdOrCtrl && e.key === 'i') {
        e.preventDefault();
        onItalic?.();
      } else if (isCmdOrCtrl && e.key === 'k') {
        e.preventDefault();
        onCommandPalette?.();
      } else if (isCmdOrCtrl && e.key === 'p') {
        e.preventDefault();
        onPrint?.();
      } else if (e.key === '/') {
        e.preventDefault();
        onSearch?.();
      }
    },
    [onSave, onBold, onItalic, onCommandPalette, onPrint, onSearch, onUndo, onRedo],
  );

  useEffect(() => {
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [handler]);
}
