import { describe, it, expect } from 'vitest';
import { guardPull, runPull } from '../../src/utils/devGitPull';

const fakeExec = (responses, failing = []) => (command) => {
  if (failing.some((prefix) => command.startsWith(prefix))) {
    const error = new Error(`fatal: ${command} failed`);
    error.status = 128;
    throw error;
  }
  for (const [prefix, output] of Object.entries(responses)) {
    if (command.startsWith(prefix)) {
      return output;
    }
  }
  return '';
};

const clean = {
  'git rev-parse --abbrev-ref HEAD': 'main\n',
  'git status --porcelain': '',
  'git ls-remote': 'abc123\trefs/heads/main\n',
};

describe('guardPull', () => {
  it('lets the update through on a clean main', () => {
    expect(guardPull(fakeExec(clean))).toBe(null);
  });

  it('refuses to update from any other branch', () => {
    const blocked = guardPull(
      fakeExec({ ...clean, 'git rev-parse --abbrev-ref HEAD': 'mi-rama\n' }),
    );
    expect(blocked).toEqual({ status: 409, error: 'not_main', branch: 'mi-rama' });
  });

  it('refuses when there are uncommitted changes', () => {
    expect(guardPull(fakeExec({ ...clean, 'git status --porcelain': ' M src/App.jsx' }))).toEqual({
      status: 409,
      error: 'dirty',
    });
  });

  it('refuses when the remote has no main to pull from', () => {
    expect(guardPull(fakeExec(clean, ['git ls-remote']))).toEqual({
      status: 409,
      error: 'no_remote_main',
    });
  });

  it('reports a folder that is not a repository', () => {
    expect(guardPull(fakeExec(clean, ['git rev-parse']))).toEqual({
      status: 500,
      error: 'not_a_repo',
    });
  });

  it('checks the branch before the working tree', () => {
    const seen = [];
    const exec = (command) => {
      seen.push(command);
      return fakeExec({ ...clean, 'git rev-parse --abbrev-ref HEAD': 'mi-rama\n' })(command);
    };
    guardPull(exec);
    expect(seen[0]).toBe('git rev-parse --abbrev-ref HEAD');
  });
});

describe('runPull', () => {
  it('pulls main and returns the git output', () => {
    const output = runPull(fakeExec({ 'git pull': 'Already up to date.\n' }));
    expect(output).toBe('Already up to date.');
  });

  it('falls back to a plain message when git says nothing', () => {
    expect(runPull(fakeExec({ 'git pull': '  ' }))).toMatch(/actualizado/i);
  });

  it('never merges anything but main', () => {
    expect(runPull.toString()).toContain('git pull origin');
  });
});