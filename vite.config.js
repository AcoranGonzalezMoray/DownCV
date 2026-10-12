import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { resolve } from 'path';
import { execSync } from 'child_process';

function getGitCommit() {
  if (process.env.VITE_APP_COMMIT) {
    return process.env.VITE_APP_COMMIT.trim();
  }
  try {
    return execSync('git rev-parse HEAD', { stdio: ['pipe', 'pipe', 'ignore'] }).toString().trim();
  } catch {
    console.warn(
      '[downcv] No git commit found. Pass it explicitly, e.g. ' +
        'docker compose build --build-arg VITE_APP_COMMIT=$(git rev-parse HEAD)',
    );
    return '';
  }
}

function getGitDate() {
  try {
    return execSync('git log -1 --format=%cI', { stdio: ['pipe', 'pipe', 'ignore'] }).toString().trim();
  } catch {
    return new Date().toISOString();
  }
}

function gitUpdatePlugin() {
  return {
    name: 'git-update-plugin',
    configureServer(server) {
      server.middlewares.use('/api/git-pull', (req, res) => {
        if (req.method !== 'POST') {
          res.statusCode = 405;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ ok: false, error: 'Method not allowed' }));
          return;
        }

        try {
          const status = execSync('git status --porcelain', {
            stdio: ['pipe', 'pipe', 'pipe'],
          }).toString().trim();

          if (status.length > 0) {
            res.statusCode = 409;
            res.setHeader('Content-Type', 'application/json');
            res.end(
              JSON.stringify({
                ok: false,
                error: 'dirty',
                message:
                  'Hay cambios locales sin commitear en Git. Guarda o haz stash antes de actualizar.',
              }),
            );
            return;
          }

          const pullOutput = execSync('git pull origin main', {
            stdio: ['pipe', 'pipe', 'pipe'],
          }).toString().trim();

          res.statusCode = 200;
          res.setHeader('Content-Type', 'application/json');
          res.end(
            JSON.stringify({
              ok: true,
              message: pullOutput || 'Actualizado correctamente a la última versión.',
            }),
          );
        } catch (err) {
          res.statusCode = 500;
          res.setHeader('Content-Type', 'application/json');
          res.end(
            JSON.stringify({
              ok: false,
              error: 'pull_failed',
              message: err.message || 'Error al ejecutar git pull',
            }),
          );
        }
      });
    },
  };
}

export default defineConfig(({ command }) => ({
  plugins: [react(), tailwindcss(), gitUpdatePlugin()],
  server: {
    port: 3000,
    open: true,
  },
  define: {
    __APP_COMMIT_SHA__: JSON.stringify(getGitCommit()),
    __APP_COMMIT_DATE__: JSON.stringify(getGitDate()),
    __IS_DEV__: JSON.stringify(command === 'serve'),
  },
  test: {
    globals: true,
    environment: 'jsdom',
    css: true,
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
    },
  },
}));
