// Exercise the actual packaged Safari worker, including missing Safari APIs.
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { unzipSync, strFromU8 } from 'fflate';
const output = new URL('../.output/safari-mv3/', import.meta.url);
const manifest = JSON.parse(readFileSync(new URL('manifest.json', output), 'utf8'));
assert.equal(manifest.manifest_version, 3);
assert.ok(manifest.permissions.includes('declarativeNetRequestWithHostAccess'));
assert.ok(manifest.permissions.includes('cookies'));
assert.ok(!manifest.permissions.includes('scripting'));
assert.ok(!manifest.key && !manifest.browser_specific_settings && !manifest.externally_connectable);
assert.ok(!manifest.optional_host_permissions.includes('https://discord.com/*'));
assert.ok(!existsSync(new URL('discord.html', output)));
const relay = manifest.content_scripts.find(script => script.js.some(path => path.includes('relay')));
assert.ok(relay?.matches.length);
const origin = manifest.homepage_url;
const events = {};
const event = name => ({ addListener: listener => { events[name] = listener; } });
const installedRules = [];
const browser = {
  runtime: {
    id: 'podium-air-safari-test',
    getURL: path => `safari-web-extension://podium-air${path}`,
    getManifest: () => manifest,
    onInstalled: event('installed'), onStartup: event('startup'),
    onMessage: event('message'), onConnect: event('connect'),
    // External messaging and cookie change events intentionally absent.
  },
  cookies: { get: async () => null },
  storage: { local: { get: async () => ({}) }, onChanged: event('storage') },
  declarativeNetRequest: { updateDynamicRules: async rules => { installedRules.push(rules); } },
};
runInNewContext(readFileSync(new URL('background.js', output), 'utf8'), {
  browser, URL, console, setTimeout, clearTimeout, TextEncoder,
});
assert.equal(typeof events.message, 'function', 'Worker must start with no cookies.onChanged');
await events.installed();
assert.equal(installedRules.length, 1);
for (const rule of installedRules[0].addRules) {
  assert.ok(rule.condition.initiatorDomains.includes(new URL(origin).hostname));
  assert.ok(!rule.action.requestHeaders?.some(header => header.header.toLowerCase() === 'x-origin'));
}
const request = method => ({ channel: 'bitchord-bridge', protocol: 1, direction: 'to-extension', id: method, method, params: {} });
const call = (method, sender) => new Promise(resolve => events.message(request(method), sender, resolve));
const sender = { id: browser.runtime.id, url: `${origin}/` };
const ping = await call('ping', sender);
assert.equal(ping.ok, true);
assert.equal(ping.result.browser, 'safari');
assert.ok(ping.result.capabilities.includes('yt.auth'));
assert.ok(!ping.result.capabilities.includes('discord'));
const forbidden = await call('ping', { ...sender, url: 'https://untrusted.example/' });
assert.equal(forbidden.error.code, 'forbidden');
const auth = await call('yt.authState', sender);
assert.equal(auth.ok, true);
assert.equal(auth.result.signedIn, false);
assert.equal(auth.result.browserSignedIn, false);
assert.ok(!JSON.stringify(auth).includes('SAPISID'));
const dist = new URL('../../app/public/downloads/', import.meta.url);
const published = JSON.parse(readFileSync(new URL('extension.json', dist), 'utf8'));
for (const name of ['chrome', 'firefox', 'safari']) assert.ok(existsSync(new URL(published.files[name], dist)));
const zip = unzipSync(readFileSync(new URL(published.files.safari, dist)));
const parent = `podium-air-extension-safari (${manifest.version})/`;
for (const path of ['manifest.json', 'README.md', 'package-safari.sh', 'LICENSE.txt', 'UPSTREAM-NOTICE.txt', 'content-scripts/relay.js']) assert.ok(zip[parent + path], path);
assert.match(strFromU8(zip[parent + 'README.md']), /not.*installable iPhone/i);
assert.deepEqual(readFileSync(new URL('podium-air-extension-safari.zip', dist)), readFileSync(new URL(published.files.safari, dist)));
console.log('Safari package checks passed: worker startup, relay origin checks, browser identity, signed-out auth, scoped rules, ZIP resources and download links.');
