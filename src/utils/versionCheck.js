import {
  BEHIND,
  CACHE_KEY,
  CHECK_INTERVAL_MS,
  CURRENT,
  DISMISS_KEY,
  PENDING_KEY,
  REPO_BRANCH,
  REPO_NAME,
  REPO_OWNER,
  REPO_URL,
  REQUEST_TIMEOUT_MS,
  UNKNOWN,
} from '../data/versionInfo';

export function runningSha() {
  return typeof __APP_COMMIT_SHA__ === 'string' ? __APP_COMMIT_SHA__.trim() : '';
}

export function runningCommitDate() {
  return typeof __APP_COMMIT_DATE__ === 'string' ? __APP_COMMIT_DATE__ : '';
}

export function runningInDev() {
  return typeof __IS_DEV__ !== 'undefined' && __IS_DEV__ === true;
}

export function isDemoEnvironment() {
  if (typeof window !== 'undefined' && window.location?.hostname?.endsWith('github.io')) {
    return true;
  }
  if (typeof import.meta !== 'undefined' && import.meta.env?.VITE_IS_DEMO === 'true') {
    return true;
  }
  return false;
}

export function compareUrlFor(sha = '') {
  if (!sha) {
    return `${REPO_URL}/commits/${REPO_BRANCH}`;
  }
  return `${REPO_URL}/compare/${sha}...${REPO_BRANCH}`;
}

export function readSession(key) {
  try {
    return window.sessionStorage.getItem(key);
  } catch {
    return null;
  }
}

export function writeSession(key, value) {
  try {
    window.sessionStorage.setItem(key, value);
  } catch {
  }
}

export function clearSession(key) {
  try {
    window.sessionStorage.removeItem(key);
  } catch {
  }
}

export function wasDismissed() {
  return readSession(DISMISS_KEY) === 'true';
}

export function markDismissed() {
  writeSession(DISMISS_KEY, 'true');
}

export function readPending(sha) {
  const raw = readSession(PENDING_KEY);
  if (!raw) {
    return null;
  }
  try {
    const stored = JSON.parse(raw);
    return stored?.sha === sha ? stored : null;
  } catch {
    return null;
  }
}

export function writePending(sha, result) {
  if (updateAvailable(result)) {
    writeSession(PENDING_KEY, JSON.stringify({ ...result, sha }));
  } else {
    clearSession(PENDING_KEY);
  }
}

function commitLine(message) {
  const [title] = String(message || '').split('\n');
  return title.trim();
}

function countOr(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function parseCompare(payload) {
  const commits = (payload?.commits || []).map((commit) => ({
    sha: String(commit?.sha || '').slice(0, 7),
    message: commitLine(commit?.commit?.message),
    author: commit?.commit?.author?.name || commit?.author?.login || '',
    date: commit?.commit?.author?.date || '',
  }));

  const aheadBy = countOr(payload?.ahead_by, 0);
  const behindBy = countOr(payload?.behind_by, 0);
  const outdated = aheadBy > 0;

  return {
    status: outdated ? BEHIND : CURRENT,
    aheadBy,
    behindBy,
    commits: outdated ? commits : [],
    compareUrl: payload?.html_url || '',
  };
}

export function readCache(sha, now = Date.now()) {
  const raw = readSession(CACHE_KEY);
  if (!raw) {
    return null;
  }
  try {
    const cached = JSON.parse(raw);
    if (cached?.sha !== sha) {
      return null;
    }
    if (now - Number(cached.at) >= CHECK_INTERVAL_MS) {
      return null;
    }
    return cached.result;
  } catch {
    return null;
  }
}

export function writeCache(sha, result, now = Date.now()) {
  writeSession(CACHE_KEY, JSON.stringify({ sha, at: now, result }));
}

export function updateAvailable(result) {
  return result?.status === BEHIND && result.aheadBy > 0;
}

export function pullErrorMessage(payload, t) {
  switch (payload?.error) {
    case 'not_main':
      return t.updateErrorNotMain.replace('{branch}', payload.branch || '');
    case 'dirty':
      return t.updateErrorDirty;
    case 'no_remote_main':
      return t.updateErrorNoRemoteMain;
    case 'not_a_repo':
      return t.updateErrorNotARepo;
    default:
      return payload?.message || t.updateErrorGeneric;
  }
}

export async function fetchCompare(
  sha,
  { fetchImpl = globalThis.fetch, timeoutMs = REQUEST_TIMEOUT_MS } = {},
) {
  const url = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/compare/${sha}...${REPO_BRANCH}`;
  const controller = typeof AbortController === 'function' ? new AbortController() : null;
  const timer = controller ? setTimeout(() => controller.abort(), timeoutMs) : null;

  try {
    const response = await fetchImpl(url, {
      headers: { Accept: 'application/vnd.github+json' },
      referrerPolicy: 'no-referrer',
      signal: controller?.signal,
    });

    if (response.status === 403 || response.status === 429) {
      return { status: UNKNOWN, reason: 'rate-limit' };
    }
    if (!response.ok) {
      return { status: UNKNOWN, reason: `http-${response.status}` };
    }
    return parseCompare(await response.json());
  } catch (error) {
    return { status: UNKNOWN, reason: error?.message || 'network' };
  } finally {
    if (timer) {
      clearTimeout(timer);
    }
  }
}

export async function checkForUpdates({
  sha = runningSha(),
  force = false,
  now = Date.now(),
  fetchImpl,
} = {}) {
  if (!sha) {
    return { status: UNKNOWN, reason: 'no-version' };
  }

  if (!force) {
    const cached = readCache(sha, now);
    if (cached) {
      return cached;
    }
  }

  const result = await fetchCompare(sha, fetchImpl ? { fetchImpl } : undefined);
  if (result.status !== UNKNOWN) {
    writeCache(sha, result, now);
  }
  return result;
}
