import { execSync } from 'child_process';

export const MAIN_BRANCH = 'main';

const realExec = (command) => execSync(command, { stdio: ['pipe', 'pipe', 'pipe'] }).toString();

export function guardPull(exec = realExec) {
  let branch = '';
  try {
    branch = exec('git rev-parse --abbrev-ref HEAD').trim();
  } catch {
    return { status: 500, error: 'not_a_repo' };
  }

  if (branch !== MAIN_BRANCH) {
    return { status: 409, error: 'not_main', branch };
  }

  if (exec('git status --porcelain').trim().length > 0) {
    return { status: 409, error: 'dirty' };
  }

  try {
    exec(`git ls-remote --exit-code --heads origin ${MAIN_BRANCH}`);
  } catch {
    return { status: 409, error: 'no_remote_main' };
  }

  return null;
}

export function runPull(exec = realExec) {
  const output = exec(`git pull origin ${MAIN_BRANCH}`).trim();
  return output || 'Actualizado correctamente a la última versión.';
}

export { realExec };
