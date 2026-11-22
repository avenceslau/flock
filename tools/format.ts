import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const [, , ...commandLineArguments] = process.argv;
const checkOnly = commandLineArguments.includes('--check');
const paths = commandLineArguments.filter((argument) => argument !== '--check');

for (const path of paths) {
  if (!existsSync(resolve(root, path))) {
    throw new Error(`Formatting path does not exist: ${path}`);
  }
}

const formatters = [
  [
    resolve(root, 'node_modules/vite-plus/bin/vp'),
    'fmt',
    ...checkOnly ? ['--check'] : [],
    '--no-error-on-unmatched-pattern',
    ...paths,
  ],
  [
    resolve(root, 'node_modules/dprint/bin.cjs'),
    checkOnly ? 'check' : 'fmt',
    '--allow-no-files',
    ...paths,
  ],
];

for (const formatterArguments of formatters) {
  const { error, status } = spawnSync(process.execPath, formatterArguments, {
    cwd: root,
    stdio: 'inherit',
  });

  if (error) {
    throw error;
  }

  if (status !== 0) {
    process.exit(status ?? 1);
  }
}
