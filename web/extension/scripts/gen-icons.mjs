// Renders the extension's toolbar and store icons from the site's app icon
// (web/app/public/favicon.png), so both carry the same Podium Air logo. WXT
// picks up public/icon/<size>.png on its own. The PNGs are committed; run this
// again only when the logo changes:
//
//   corepack pnpm --dir web/extension icons

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { Resvg } from '@resvg/resvg-js';

const bytes = readFileSync(new URL('../../app/public/favicon.png', import.meta.url));
const source = `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512"><image width="512" height="512" href="data:image/png;base64,${bytes.toString('base64')}" /></svg>`;
const target = fileURLToPath(new URL('../public/icon/', import.meta.url));
mkdirSync(target, { recursive: true });

for (const size of [16, 32, 48, 96, 128]) {
  const png = new Resvg(source, { fitTo: { mode: 'width', value: size } }).render().asPng();
  writeFileSync(`${target}${size}.png`, png);
  console.log(`public/icon/${size}.png`);
}
