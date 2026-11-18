import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { expect, it } from 'vitest';

it('waits for removal of private legacy data and preserves static caches', async () => {
  const stored = new Set(['sh-api', 'workbox-precache']);
  const handlers = {};
  runInNewContext(readFileSync('public/retire-api-cache.js', 'utf8'), {
    self: { addEventListener: (name, handler) => { handlers[name] = handler; } },
    caches: { delete: async name => stored.delete(name) },
  });
  let cleanup;
  handlers.activate({ waitUntil: promise => { cleanup = promise; } });
  expect(await cleanup).toBe(true);
  expect([...stored]).toEqual(['workbox-precache']);
});
