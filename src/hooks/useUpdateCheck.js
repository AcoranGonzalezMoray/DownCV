import { useCallback, useEffect, useRef, useState } from 'react';
import {
  checkForUpdates,
  markDismissed,
  runningInDev,
  runningSha,
  updateAvailable,
  wasDismissed,
} from '../utils/versionCheck';

export default function useUpdateCheck() {
  const [isOpen, setIsOpen] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const [updateInfo, setUpdateInfo] = useState(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [updateError, setUpdateError] = useState('');
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const checkNow = useCallback(async (force = true) => {
    setIsChecking(true);
    setUpdateError('');
    try {
      const result = await checkForUpdates({ force });
      if (!mounted.current) {
        return null;
      }
      setUpdateInfo(result);
      if (updateAvailable(result)) {
        setIsOpen(true);
      }
      return result;
    } finally {
      if (mounted.current) {
        setIsChecking(false);
      }
    }
  }, []);

  const sha = runningSha();

  useEffect(() => {
    if (!sha || wasDismissed()) {
      return;
    }
    checkNow(false);
  }, [checkNow, sha]);

  const dismiss = useCallback(() => {
    markDismissed();
    setIsOpen(false);
  }, []);

  const reveal = useCallback(() => {
    setIsOpen(true);
  }, []);

  const update = useCallback(async () => {
    if (!runningInDev()) {
      return { ok: false, reason: 'manual' };
    }

    setIsUpdating(true);
    setUpdateError('');
    try {
      const response = await fetch('/api/git-pull', { method: 'POST' });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || !payload.ok) {
        throw new Error(payload.message || payload.error || 'Update failed');
      }
      window.location.reload();
      return { ok: true, message: payload.message };
    } catch (error) {
      if (mounted.current) {
        setUpdateError(error?.message || 'Update failed');
      }
      return { ok: false, message: error?.message };
    } finally {
      if (mounted.current) {
        setIsUpdating(false);
      }
    }
  }, []);

  return {
    isOpen,
    isChecking,
    updateInfo,
    isUpdating,
    updateError,
    currentSha: sha,
    isDev: runningInDev(),
    dismiss,
    reveal,
    update,
    checkNow,
  };
}
