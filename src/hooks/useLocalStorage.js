import { useState, useCallback } from 'react';

const STORAGE_KEY_PREFIX = 'downcv_';

export default function useLocalStorage(key, initialValue) {
  const [storedValue, setStoredValue] = useState(() => {
    try {
      const item = window.localStorage.getItem(STORAGE_KEY_PREFIX + key);
      return item ? JSON.parse(item) : initialValue;
    } catch (_e) {
      return initialValue;
    }
  });

  const setValue = useCallback(
    (value) => {
      try {
        const valueToStore = value instanceof Function ? value(storedValue) : value;
        setStoredValue(valueToStore);
        window.localStorage.setItem(STORAGE_KEY_PREFIX + key, JSON.stringify(valueToStore));
      } catch (_e) {}
    },
    [key, storedValue],
  );

  const removeValue = useCallback(() => {
    try {
      window.localStorage.removeItem(STORAGE_KEY_PREFIX + key);
      setStoredValue(initialValue);
    } catch (_e) {}
  }, [key, initialValue]);

  return [storedValue, setValue, removeValue];
}
