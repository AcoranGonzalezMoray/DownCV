import { useCallback, useEffect, useRef, useState } from 'react';
import {
  checkForUpdates,
  markDismissed,
  readPending,
  runningInDev,
  runningSha,
  updateAvailable,
  wasDismissed,
  writePending,
  pullErrorMessage,
} from '../utils/versionCheck';

export default function useUpdateCheck({ t } = {}) {
  const sha = runningSha();
  const [updateInfo, setUpdateInfo] = useState(() => (sha ? readPending(sha) : null));
  const [isOpen, setIsOpen] = useState(false);
  const [resolved, setResolved] = useState(null);
  const pendingCount = useRef(0);
  const [isChecking, setIsChecking] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [updateError, setUpdateError] = useState('');
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const checkNow = useCallback(
    async (force = true) => {
      setIsChecking(true);
      setUpdateError('');
      try {
        const result = await checkForUpdates({ force });
        if (!mounted.current) {
          return null;
        }
        setUpdateInfo(result);
        writePending(sha, result);
        if (updateAvailable(result)) {
          pendingCount.current = result.aheadBy;
        }
        if (updateAvailable(result)) {
          setIsOpen(true);
        }
        return result;
      } finally {
        if (mounted.current) {
          setIsChecking(false);
        }
      }
    },
    [sha],
  );

  useEffect(() => {
    if (!sha || wasDismissed()) {
      return;
    }
    checkNow(false);
  }, [checkNow, sha]);

  const dismiss = useCallback(() => {
    markDismissed();
    setResolved(null);
    setIsOpen(false);
  }, []);

  const reveal = useCallback(async () => {
    const result = await checkNow(true);
    if (!result) {
      return null;
    }
    if (updateAvailable(result)) {
      setResolved(null);
      setIsOpen(true);
    } else {
      setResolved({ previousCount: pendingCount.current });
      setIsOpen(true);
    }
    return result;
  }, [checkNow]);

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
        throw new Error(pullErrorMessage(payload, t));
      }
      window.location.reload();
      return { ok: true, message: payload.message };
    } catch (error) {
      if (mounted.current) {
        setUpdateError(error?.message || pullErrorMessage({}, t));
      }
      return { ok: false, message: error?.message };
    } finally {
      if (mounted.current) {
        setIsUpdating(false);
      }
    }
  }, [t]);

  return {
    isOpen,
    isChecking,
    updateInfo,
    isUpdating,
    updateError,
    currentSha: sha,
    isDev: runningInDev(),
    isOutdated: updateAvailable(updateInfo),
    resolved,
    dismiss,
    reveal,
    update,
    checkNow,
  };
}
