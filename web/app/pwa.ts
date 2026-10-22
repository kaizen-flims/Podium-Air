import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import type { Plugin } from 'vite';

/** Cache only this build's static shell. Never cache sessions, APIs or media. */
export function pwaShell(): Plugin {
  return {
    name: 'podium-air-pwa-shell',
    apply: 'build',
    generateBundle(_options, bundle) {
      const publicFiles = ['favicon.png', 'logo-mark.png', 'icon-180.png', 'icon-192.png',
        'icon-512.png', 'manifest.webmanifest', 'LICENSE.txt', 'UPSTREAM-NOTICE.txt'];
      const assets = ['index.html', ...Object.keys(bundle), ...publicFiles].filter((p) => !p.endsWith('.map')).map((p) => `/${p}`);
      const hash = createHash('sha256');
      for (const entry of Object.values(bundle)) hash.update(entry.type === 'chunk' ? entry.code : entry.source);
      for (const path of publicFiles) hash.update(readFileSync(new URL(`./public/${path}`, import.meta.url)));
      const version = hash.digest('hex').slice(0, 16);
      this.emitFile({ type: 'asset', fileName: 'sw.js', source: `
const CACHE = 'podium-air-shell-${version}';
const ASSETS = ${JSON.stringify(assets)};
self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(ASSETS)));
});
self.addEventListener('activate', (event) => {
  event.waitUntil(caches.keys().then((keys) => Promise.all(
    keys.filter((key) => key.startsWith('podium-air-shell-') && key !== CACHE).map((key) => caches.delete(key))
  )).then(() => self.clients.claim()));
});
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  if (event.request.method !== 'GET' || url.origin !== self.location.origin) return;
  if (event.request.mode === 'navigate') {
    // Only SPA routes receive the offline app shell; download/API errors stay errors.
    if (/^\\/(api|downloads)(\\/|$)/.test(url.pathname) || /\\.[a-z0-9]+$/i.test(url.pathname)) return;
    event.respondWith(fetch(event.request).catch(() => caches.open(CACHE).then((cache) => cache.match('/index.html'))));
  } else if (!url.search && ASSETS.includes(url.pathname)) {
    event.respondWith(caches.open(CACHE).then((cache) => cache.match(url.pathname)).then((hit) => hit || fetch(event.request)));
  }
});
` });
    },
  };
}
