import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const matrixPath = resolve(root, 'scripts/regression-matrix.json');
const matrix = JSON.parse(readFileSync(matrixPath, 'utf8'));

if (!Array.isArray(matrix.entries)) {
  console.error('[netlab-run] regression-matrix.json must contain entries[]');
  process.exit(2);
}

let failureCount = 0;

for (const [index, entry] of matrix.entries.entries()) {
  const scenario = entry.scenario;
  const session = resolve(root, entry.session);
  const assertions = resolve(root, entry.assertions);
  const label = entry.name ?? `${scenario} #${index + 1}`;
  const result = spawnSync(
    process.execPath,
    [resolve(root, 'bin/netlab-run.mjs'), scenario, session, assertions, '--tap'],
    {
      cwd: root,
      encoding: 'utf8',
    },
  );

  process.stdout.write(`# ${label}\n`);
  process.stdout.write(result.stdout);
  process.stderr.write(result.stderr);

  if (result.status === null) {
    failureCount += 1;
    continue;
  }
  failureCount += result.status;
}

process.exitCode = Math.min(failureCount, 255);
