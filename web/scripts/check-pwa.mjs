// Validate actual build output and offline behavior, without live accounts.
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
const base = process.argv[2] ?? '/';
const dist = new URL('../app/dist/', import.meta.url);
const read = (p) => readFileSync(new URL(p, dist), 'utf8');
const manifest = JSON.parse(read('manifest.webmanifest'));
assert.equal(manifest.name, 'Podium Air');
assert.equal(manifest.display, 'standalone');
const origin = 'https://pwa.test';
for (const icon of manifest.icons) {
  const path = new URL(icon.src, origin + base).pathname;
  assert.ok(path.startsWith(base));
  assert.ok(existsSync(new URL(path.slice(base.length), dist)));
}
assert.equal(new URL(manifest.scope, origin + base).pathname, base);
assert.equal(new URL(manifest.start_url, origin + base).pathname, base);
assert.match(read('index.html'), /<title>Podium Air<\/title>/);
assert.doesNotMatch(read('index.html'), /bitchord\.in|favicon\.svg/);
assert.ok(read('index.html').includes(`${base}assets/`));
for (const page of ['about.html', 'privacy.html', 'terms.html']) {
  const html = read(page);
  assert.match(html, /<h1>/);
  assert.ok(html.includes('privacy.html') && html.includes('terms.html'));
  for (const [, link] of html.matchAll(/(?:href|src)="([^"]+)"/g)) {
    if (/^(https?:|#)/.test(link)) continue;
    const target = new URL(link, origin + base + page);
    const file = target.pathname.slice(base.length) || 'index.html';
    assert.ok(target.pathname.startsWith(base) && existsSync(new URL(file, dist)), `Missing public-page link: ${link}`);
  }
}
const listeners = {};
const cached = new Map();
const deleted = [];
const fetched = [];
const worker = read('sw.js');
const prefix = /const CACHE_PREFIX = '([^']+)'/.exec(worker)[1];
const cache = {
  async addAll(paths) {
    assert.ok(paths.includes(base + 'index.html'), 'Offline navigation requires cached HTML');
    for (const path of paths) {
      assert.ok(path.startsWith(base));
      assert.ok(existsSync(new URL(path.slice(base.length), dist)), `Missing precache file: ${path}`);
      assert.ok(!path.startsWith(base + 'downloads/'));
      cached.set(path, { path });
    }
  },
  async match(path) { return cached.get(path); },
};
runInNewContext(worker, {
  URL, Promise,
  self: { location: { origin }, clients: { claim: async () => {} },
    addEventListener: (event, fn) => { listeners[event] = fn; } },
  caches: { open: async () => cache, keys: async () => ['other-app', prefix + 'old', 'podium-air-shell-other-scope-old'],
    delete: async (key) => { deleted.push(key); } },
  fetch: async (request) => { fetched.push(request.url); throw new Error('offline'); },
});
let pending;
listeners.install({ waitUntil: (p) => { pending = p; } });
await pending;
listeners.activate({ waitUntil: (p) => { pending = p; } });
await pending;
assert.deepEqual(deleted, [prefix + 'old']);
async function request(path, mode = 'cors', method = 'GET') {
  let response;
  listeners.fetch({ request: { url: new URL(path, origin).href, method, mode },
    respondWith: (p) => { response = p; } });
  return response;
}
assert.equal((await request(base + 'settings', 'navigate')).path, base + 'index.html');
for (const page of ['about.html', 'privacy.html', 'terms.html']) {
  assert.equal((await request(base + page, 'navigate')).path, base + page);
}
const asset = [...cached.keys()].find((p) => p.endsWith('.js'));
assert.equal((await request(asset)).path, asset);
for (const path of ['api/session', 'downloads/extension.json', 'downloads/missing.zip']) {
  assert.equal(await request(base + path, 'navigate'), undefined);
}
if (base !== '/') assert.equal(await request('/another-site/', 'navigate'), undefined);
assert.equal(await request('https://music.youtube.com/account'), undefined);
assert.equal(await request(base + 'api/session', 'cors', 'POST'), undefined);
assert.equal(await request(asset + '?token=private'), undefined);
assert.deepEqual(fetched, ['settings', 'about.html', 'privacy.html', 'terms.html'].map((page) => origin + base + page));
console.log(`PWA checks passed for ${base}: assets, manifest, offline routing, API/media exclusion, cache isolation.`);
