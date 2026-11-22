import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, beforeEach, expect, test } from 'vite-plus/test';

const root = fileURLToPath(new URL('../../', import.meta.url));
const directory = fileURLToPath(new URL('.', import.meta.url));
const commandTimeoutMs = 30_000;
let fixtureDirectory: string;

beforeEach(() => {
  fixtureDirectory = mkdtempSync(join(directory, 'toolchain-fixture-'));
});

afterEach(() => {
  rmSync(fixtureDirectory, { recursive: true, force: true });
});

function checkFixture(source: string, args: string[]) {
  const fixture = join(fixtureDirectory, 'input.ts');
  writeFileSync(fixture, source);

  const processOutput = spawnSync(join(root, 'node_modules/.bin/vp'), [...args, fixture], {
    cwd: root,
    encoding: 'utf8',
    timeout: commandTimeoutMs,
  });

  expect(processOutput.error).toBeUndefined();
  expect(processOutput.signal).toBeNull();

  return {
    status: processOutput.status,
    output: processOutput.stdout + processOutput.stderr,
  };
}

test.each([
  {
    diagnostic: 'anti-slop(no-reflect-get)',
    source: "export const name = Reflect.get({ name: 'Flock' }, 'name');",
  },
  {
    diagnostic: 'anti-slop(no-unknown-parameters)',
    source: 'export function accept(input: unknown) { return String(input); }',
  },
  {
    diagnostic: 'durability(abort-after-sync)',
    source: "export function reset(ctx) { ctx.abort('reset'); }",
  },
  {
    diagnostic: 'durability(alarm-runner-only)',
    source: 'export class Jobs { durability = new Durability(); alarm() {} }',
  },
  {
    diagnostic: 'durability(durability-migrations-only)',
    source: readFileSync(new URL('./fixtures/create-table.txt', import.meta.url), 'utf8'),
  },
  {
    diagnostic: 'durability(no-alarm-changes-in-alarm-handler)',
    source: 'export class Jobs { alarm() { this.ctx.storage.setAlarm(1); } }',
  },
  {
    diagnostic: 'durability(no-delete-all-in-transaction)',
    source: 'storage.transaction(async (transaction) => { await transaction.deleteAll(); });',
  },
  {
    diagnostic: 'durability(no-deferred-storage-writes)',
    source: "setTimeout(() => { storage.put('job', 'pending'); }, 1);",
  },
  {
    diagnostic: 'durability(transaction-sync-callback)',
    source: 'storage.transactionSync(async () => { await Promise.resolve(); });',
  },
  {
    diagnostic: 'durability(transform-next-once)',
    source: 'defineTransform().caller(() => async ({ next }) => { await next(); return next(); });',
  },
])('rejects $diagnostic through the configured linter', ({ diagnostic, source }) => {
  const diagnostics = checkFixture(source, ['lint', '--format', 'unix']);

  expect(diagnostics.status).toBe(1);
  expect(diagnostics.output).toContain(`[Error/${diagnostic}]`);
});

test('accepts formatted, typed source through all static checks', () => {
  const diagnostics = checkFixture("export const name = 'Flock';\n", ['check']);

  expect(diagnostics.status).toBe(0);
});

test('rejects TypeScript errors with lint and formatting disabled', () => {
  const diagnostics = checkFixture("export const count: number = 'wrong';\n", [
    'check',
    '--no-fmt',
    '--no-lint',
  ]);

  expect(diagnostics.status).toBe(1);
  expect(diagnostics.output).toContain('2322');
});

test('rejects unformatted source with lint disabled', () => {
  const diagnostics = checkFixture('export const names=["Flock"]', ['check', '--no-lint']);

  expect(diagnostics.status).toBe(1);
  expect(diagnostics.output).toContain('input.ts');
});
