// Validate actual build output and offline behavior, without accessing live accounts.
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
const dist = new URL('../app/dist/', import.meta.url);
const read = (p) => readFileSync(new URL(p, dist), 'utf8');
const manifest = JSON.parse(read('manifest.webmanifest'));
assert.equal(manifest.name, 'Podium Air');
assert.equal(manifest.display, 'standalone');
for (const icon of manifest.icons) assert.ok(existsSync(new URL(icon.src.slice(1), dist)));
assert.match(read('index.html'), /<title>Podium Air<\/title>/);
assert.doesNotMatch(read('index.html'), /bitchord\.in|favicon\.svg/);
const listeners = {};
const cached = new Map();
const deleted = [];
let fetched = [];
const cache = {
  async addAll(paths) {
    assert.ok(paths.includes('/index.html'), 'Offline navigation requires cached HTML');
    for (const path of paths) {
      assert.ok(existsSync(new URL(path.slice(1), dist)), `Missing precache file: ${path}`);
      assert.ok(!path.startsWith('/downloads/'));
      cached.set(path, { path });
    }
  },
  async match(path) { return cached.get(path); },
};
runInNewContext(read('sw.js'), {
  URL, Promise,
  self: { location: { origin: 'https://pwa.test' }, clients: { claim: async () => {} },
    addEventListener: (event, fn) => { listeners[event] = fn; } },
  caches: { open: async () => cache, keys: async () => ['other-app', 'podium-air-shell-old'],
    delete: async (key) => { deleted.push(key); } },
  fetch: async (request) => { fetched.push(request.url); throw new Error('offline'); },
});
let pending;
listeners.install({ waitUntil: (p) => { pending = p; } });
await pending;
listeners.activate({ waitUntil: (p) => { pending = p; } });
await pending;
assert.deepEqual(deleted, ['podium-air-shell-old']);
async function request(path, mode = 'cors', method = 'GET') {
  let response;
  listeners.fetch({ request: { url: new URL(path, 'https://pwa.test').href, method, mode },
    respondWith: (p) => { response = p; } });
  return response;
}
assert.equal((await request('/settings', 'navigate')).path, '/index.html');
const asset = [...cached.keys()].find((p) => p.endsWith('.js'));
assert.equal((await request(asset)).path, asset);
for (const path of ['/api/session', '/downloads/extension.json', '/downloads/missing.zip']) {
  assert.equal(await request(path, 'navigate'), undefined);
}
assert.equal(await request('https://music.youtube.com/account'), undefined);
assert.equal(await request('/api/session', 'cors', 'POST'), undefined);
assert.equal(await request(asset + '?token=private'), undefined);
assert.deepEqual(fetched, ['https://pwa.test/settings']);
console.log('PWA build checks passed: assets, manifest, offline routing, API/media exclusion, cache isolation.');
