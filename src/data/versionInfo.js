export const REPO_OWNER = 'AcoranGonzalezMoray';
export const REPO_NAME = 'DownCV';
export const REPO_BRANCH = 'main';
export const REPO_URL = `https://github.com/${REPO_OWNER}/${REPO_NAME}`;

export const UPDATE_COMMAND = 'git pull && npm run docker:up';

export const CACHE_KEY = 'downcv_update_check';
export const DISMISS_KEY = 'downcv_update_dismissed';
export const PENDING_KEY = 'downcv_update_pending';

export const CHECK_INTERVAL_MS = 30 * 60 * 1000;
export const REQUEST_TIMEOUT_MS = 8000;

export const UNKNOWN = 'unknown';
export const BEHIND = 'behind';
export const CURRENT = 'current';
