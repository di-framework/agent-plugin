import { test, expect } from 'bun:test';
import { mkdtemp, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { scaffoldProvider } from './scaffold-provider';

test('generated classes compile and honor singleton and transient lifecycles', async () => {
  const dir = await mkdtemp(join(process.cwd(), '.scaffold-test-'));
  try {
    for (const lifecycle of ['Singleton', 'Transient']) {
      const file = join(dir, `${lifecycle}.ts`);
      await Bun.write(file, scaffoldProvider('PaymentService', lifecycle) + `
import assert from 'node:assert/strict';
import { useContainer } from '@di-framework/core/container';
const container = useContainer();
assert.${lifecycle === 'Singleton' ? 'equal' : 'notEqual'}(container.resolve(PaymentService), container.resolve(PaymentService));
`);
      const check = Bun.spawn(['bun', 'x', '--no-install', 'tsc', '--noEmit', '--skipLibCheck', '--experimentalDecorators', '--target', 'ESNext', '--moduleResolution', 'bundler', '--module', 'ESNext', file], { stdout: 'pipe', stderr: 'pipe' });
      expect(await new Response(check.stdout).text()).toBe('');
      expect(await check.exited).toBe(0);
      // Bun reads decorator settings from the cwd tsconfig; skills/ enables legacy decorators.
      const run = Bun.spawn(['bun', file], { cwd: join(process.cwd(), 'skills'), stdout: 'pipe', stderr: 'pipe' });
      expect(await new Response(run.stderr).text()).toBe('');
      expect(await run.exited).toBe(0);
    }
  } finally { await rm(dir, { recursive: true, force: true }); }
}, 30000);

test('rejects unsupported versions, lifecycles, and invalid identifiers', () => {
  for (const name of ['foo', 'Container', 'Bad;throw', 'A\nB']) expect(() => scaffoldProvider(name)).toThrow();
  expect(() => scaffoldProvider('Service', 'Scoped')).toThrow('Supported lifecycles');
  expect(() => scaffoldProvider('Service', 'Singleton', '5.3.0')).toThrow('Unsupported framework version');
  expect(scaffoldProvider('Service')).toContain('@di-framework/core 6.0.3');
  expect(scaffoldProvider('Service', 'Singleton', 'v6.0.1')).toContain('@di-framework/core 6.0.1');
});
