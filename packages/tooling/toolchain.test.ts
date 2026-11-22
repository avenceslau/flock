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

function checkFixture(
  source: string,
  commandArguments: string[],
  filename = 'input.ts',
) {
  const fixture = join(fixtureDirectory, filename);
  writeFileSync(fixture, source);

  const processOutput = spawnSync(join(root, 'node_modules/.bin/vp'), [
    ...commandArguments,
    fixture,
  ], {
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
  const diagnostics = checkFixture("export const name = 'Flock';\n", ['run', 'check']);

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

test('rejects unformatted TypeScript through the canonical check without writing', () => {
  const source = 'export const names=["Flock"]';
  const diagnostics = checkFixture(source, ['run', 'check']);

  expect(diagnostics.status).toBe(20);
  expect(diagnostics.output).toContain('input.ts');
  expect(readFileSync(join(fixtureDirectory, 'input.ts'), 'utf8')).toBe(source);
});

test('formats unformatted TypeScript and then accepts the result', () => {
  const formatted = checkFixture('export const names=["Flock"]', ['run', 'fmt']);
  const source = readFileSync(join(fixtureDirectory, 'input.ts'), 'utf8');

  expect(formatted.status).toBe(0);
  expect(source).toBe("export const names = ['Flock'];\n");
  expect(checkFixture(source, ['run', 'check']).status).toBe(0);
});

test('keeps JSON formatting checked by Oxfmt', () => {
  const source = '{"name":"Flock"}';

  const checked = checkFixture(
    source,
    ['run', 'fmt', '--check'],
    'input.json',
  );

  const fixture = join(fixtureDirectory, 'input.json');

  expect(checked.status).toBe(1);
  expect(checked.output).toContain('input.json');
  expect(readFileSync(fixture, 'utf8')).toBe(source);

  const formatted = checkFixture(source, ['run', 'fmt'], 'input.json');
  const formattedSource = readFileSync(fixture, 'utf8');

  expect(formatted.status).toBe(0);
  expect(formattedSource).not.toBe(source);
  expect(JSON.parse(formattedSource)).toEqual({ name: 'Flock' });
  expect(
    checkFixture(
      formattedSource,
      ['run', 'fmt', '--check'],
      'input.json',
    ).status,
  ).toBe(0);
});

test('does not format files outside the requested path', () => {
  const otherCode = join(fixtureDirectory, 'other.ts');
  const otherJson = join(fixtureDirectory, 'other.json');

  writeFileSync(otherCode, 'export const count=1');
  writeFileSync(otherJson, '{"count":1}');

  const formatted = checkFixture('export const count=2', ['run', 'fmt']);

  expect(formatted.status).toBe(0);
  expect(readFileSync(otherCode, 'utf8')).toBe('export const count=1');
  expect(readFileSync(otherJson, 'utf8')).toBe('{"count":1}');
});

test('rejects a missing path before formatting anything', () => {
  const source = 'export const count=1';
  const missing = join(fixtureDirectory, 'missing.ts');
  const diagnostics = checkFixture(source, ['run', 'fmt', missing]);

  expect(diagnostics.status).toBe(1);
  expect(diagnostics.output).toContain('Formatting path does not exist');
  expect(readFileSync(join(fixtureDirectory, 'input.ts'), 'utf8')).toBe(source);
});

test.each([
  {
    layout: 'three-argument calls',
    source: `await conversationStorage.open(
  storageAdapter,
  extensionRegistry,
  backgroundContext,
);
`,
  },
  {
    layout: 'four-argument calls',
    source: `submitAgentEvent(
  definition,
  conversation,
  event,
  backgroundContext,
);
`,
  },
  {
    layout: 'object destructuring',
    source: `const {
  definition,
  conversation,
  event,
  backgroundContext,
} = submission;
`,
  },
  {
    layout: 'array destructuring',
    source: `const [
  definition,
  conversation,
  event,
  backgroundContext,
] = submission;
`,
  },
  {
    layout: 'object literals',
    source: `const event = {
  id: 'message-1',
  type: 'message',
  content: 'Hello',
};
`,
  },
  {
    layout: 'boolean conditions',
    source: `if (
  enabled &&
  ready &&
  connected
) {
  start();
}
`,
  },
])('preserves vertical $layout through repeated formatting', ({ source }) => {
  const fixture = join(fixtureDirectory, 'input.ts');
  const first = checkFixture(source, ['run', 'fmt']);

  expect(first.status).toBe(0);
  expect(readFileSync(fixture, 'utf8')).toBe(source);

  const second = checkFixture(source, ['run', 'fmt']);

  expect(second.status).toBe(0);
  expect(readFileSync(fixture, 'utf8')).toBe(source);

  const checked = checkFixture(source, ['run', 'fmt', '--check']);

  expect(checked.status).toBe(0);
  expect(readFileSync(fixture, 'utf8')).toBe(source);
});
