import { useCallback, useEffect, useMemo, useState } from 'react';
import { scanContacts, WARNABLE_ISSUES } from '../utils/contactScan';

const PREFIX = 'downcv_';
const KEYS = { verified: 'contact_verified', dismissed: 'contact_dismissed' };

const SYNC_EVENT = 'downcv:contact-check';

const readState = (key) => {
  try {
    const raw = window.localStorage.getItem(PREFIX + key);
    const parsed = raw ? JSON.parse(raw) : null;
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
};

const publish = (key, value) => {
  try {
    const raw = JSON.stringify(value);
    if (window.localStorage.getItem(PREFIX + key) !== raw) {
      window.localStorage.setItem(PREFIX + key, raw);
      window.dispatchEvent(new Event(SYNC_EVENT));
    }
  } catch {}
};

export default function useContactVerification(markdown) {
  const { items, problems } = useMemo(() => scanContacts(markdown), [markdown]);
  const [verified, setVerified] = useState(() => readState(KEYS.verified));
  const [dismissed, setDismissed] = useState(() => readState(KEYS.dismissed));

  useEffect(() => {
    publish(KEYS.verified, verified);
  }, [verified]);
  useEffect(() => {
    publish(KEYS.dismissed, dismissed);
  }, [dismissed]);

  useEffect(() => {
    const sync = () => {
      setVerified(readState(KEYS.verified));
      setDismissed(readState(KEYS.dismissed));
    };

    window.addEventListener(SYNC_EVENT, sync);
    window.addEventListener('storage', sync);
    return () => {
      window.removeEventListener(SYNC_EVENT, sync);
      window.removeEventListener('storage', sync);
    };
  }, []);

  const mark = useCallback((id) => {
    setVerified((previous) => ({ ...previous, [id]: new Date().toISOString() }));
  }, []);

  const ignore = useCallback((id) => {
    setDismissed((previous) => ({ ...previous, [id]: true }));
  }, []);

  const checkAgain = useCallback(() => {
    setVerified({});
    setDismissed({});
  }, []);

  const pending = items.filter((item) => !verified[item.id] && !dismissed[item.id]);
  const checked = items.filter((item) => verified[item.id]).length;
  const done = items.length > 0 && pending.length === 0 && checked > 0;
  const warnable = pending.filter((item) =>
    item.issues.some((issue) => WARNABLE_ISSUES.includes(issue)),
  );

  const hasWarning = pending.length > 0 || (items.length === 0 && problems.length > 0);

  return {
    items,
    problems,
    verified,
    dismissed,
    pending,
    checked,
    done,
    warnable,
    hasWarning,
    mark,
    ignore,
    checkAgain,
  };
}
