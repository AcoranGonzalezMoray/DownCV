import { execFileSync, spawnSync } from 'child_process';

const commit = execFileSync('git', ['rev-parse', 'HEAD'], {
  encoding: 'utf8',
  stdio: ['pipe', 'pipe', 'pipe'],
}).trim();

if (!commit) {
  console.error('Could not read the current commit with git rev-parse HEAD.');
  process.exit(1);
}

console.log(`Building DownCV at commit ${commit.slice(0, 7)}`);

const run = (args) => {
  const result = spawnSync('docker', ['compose', ...args], { stdio: 'inherit', shell: false });
  if (result.error) {
    console.error(`Failed to run docker compose ${args[0]}: ${result.error.message}`);
    process.exit(1);
  }
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
};

const daemon = spawnSync('docker', ['info'], { stdio: 'ignore', shell: false });
if (daemon.status !== 0) {
  console.error('Docker is not running. Start Docker Desktop and run this again.');
  process.exit(1);
}

run(['build', '--build-arg', `VITE_APP_COMMIT=${commit}`]);
run(['up', '-d']);