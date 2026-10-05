import { expect, test } from 'bun:test';
import { resolve } from 'node:path';

for (const file of [
  'di-framework/examples/container-patterns.ts',
  'di-framework/examples/http-api.ts',
  'di-framework/examples/repository.ts',
  'di-framework/examples/rpc.ts',
]) {
  test(`published framework example: ${file}`, async () => {
    // Bun resolves runtime compiler options from cwd; examples need legacy decorators.
    const process = Bun.spawn(['bun', file], {
      cwd: resolve(import.meta.dir, '../../skills'), stdout: 'pipe', stderr: 'pipe',
    });
    const errors = await new Response(process.stderr).text();
    expect(errors).toBe('');
    expect(await process.exited).toBe(0);
  });
}

test('skill asset tests', async () => {
  const process = Bun.spawn(['bun', 'test', './di-framework/assets'], {
    cwd: resolve(import.meta.dir, '../../skills'), stdout: 'pipe', stderr: 'pipe',
  });
  const output = await new Response(process.stderr).text();
  expect(await process.exited, output).toBe(0);
  expect(output).toMatch(/\b0 fail\b/);
});
