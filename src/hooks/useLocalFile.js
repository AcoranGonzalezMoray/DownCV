import { useCallback, useEffect, useRef, useState } from 'react';

const PICKER_OPTIONS = {
  types: [
    {
      description: 'Markdown',
      accept: { 'text/markdown': ['.md', '.markdown', '.txt'] },
    },
  ],
  excludeAcceptAllOption: false,
  multiple: false,
};

export function fileSystemAccessSupported() {
  return (
    typeof window !== 'undefined' &&
    typeof window.showOpenFilePicker === 'function' &&
    typeof window.FileSystemFileHandle === 'function'
  );
}

function nameOf(handle) {
  return handle?.name || null;
}

export default function useLocalFile({ onRead, onWrite, onError } = {}) {
  const [fileName, setFileName] = useState(null);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState('idle');
  const handleRef = useRef(null);
  const dirtyRef = useRef(false);

  const report = useCallback(
    (event, payload) => {
      if (event === 'error' && onError) {
        onError(payload);
      }
    },
    [onError],
  );

  useEffect(() => {
    handleRef.current = null;
    setFileName(null);
    setStatus('idle');
    dirtyRef.current = false;
  }, []);

  const link = useCallback(async () => {
    if (!fileSystemAccessSupported()) {
      report('error', 'unsupported');
      return false;
    }
    setBusy(true);
    try {
      const [handle] = await window.showOpenFilePicker(PICKER_OPTIONS);
      if (!handle) {
        return false;
      }
      const file = await handle.getFile();
      const text = await file.text();
      handleRef.current = handle;
      dirtyRef.current = false;
      setFileName(nameOf(handle));
      setStatus('saved');
      if (onRead) {
        onRead(text, nameOf(handle));
      }
      return true;
    } catch (e) {
      if (e?.name !== 'AbortError') {
        report('error', e);
      }
      return false;
    } finally {
      setBusy(false);
    }
  }, [onRead, report]);

  const save = useCallback(
    async (text, { silent = false } = {}) => {
      const content = String(text ?? '');
      if (!fileSystemAccessSupported()) {
        if (silent) {
          return false;
        }
        report('error', 'unsupported');
        return false;
      }
      setBusy(true);
      try {
        let handle = handleRef.current;
        if (!handle) {
          if (silent) {
            return false;
          }
          handle = await window.showSaveFilePicker({ ...PICKER_OPTIONS, suggestedName: 'cv.md' });
          if (!handle) {
            return false;
          }
          handleRef.current = handle;
          setFileName(nameOf(handle));
        }
        const writable = await handle.createWritable();
        await writable.write(content);
        await writable.close();
        dirtyRef.current = false;
        setStatus('saved');
        if (onWrite) {
          onWrite(content, nameOf(handle));
        }
        return true;
      } catch (e) {
        setStatus('error');
        report('error', e);
        return false;
      } finally {
        setBusy(false);
      }
    },
    [onWrite, report],
  );

  const unlink = useCallback(() => {
    handleRef.current = null;
    dirtyRef.current = false;
    setFileName(null);
    setStatus('idle');
  }, []);

  const markDirty = useCallback(() => {
    if (!handleRef.current) {
      return;
    }
    dirtyRef.current = true;
    setStatus('dirty');
  }, []);

  return {
    supported: fileSystemAccessSupported(),
    fileName,
    busy,
    status,
    isLinked: Boolean(fileName),
    hasUnsavedToDisk: dirtyRef.current,
    link,
    save,
    unlink,
    markDirty,
  };
}
