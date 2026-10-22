# Podium Air Web / PWA

Official web implementation imported from [BitChord](https://github.com/kushagrasinghx/BitChord)
commit `edc1e6f36febf71a118e649411d2fc21b70ead45`, maintained by Prem / Kaizen.
See [UPSTREAM-NOTICE.txt](UPSTREAM-NOTICE.txt) and [LICENSE](LICENSE).

This workspace is independent of the Android and desktop Gradle builds.
`app/` contains the Vite/React player, `extension/` the Chromium/Firefox companion,
and `shared/` the TypeScript bridge contract. No Kotlin module needs importing.
The original interface, routes, animations, playback and account logic remain.

## Local development

Use Node >=22 and the pinned pnpm version (12.11.2). Run **inside `web/`**:

```sh
cd web
corepack pnpm install --frozen-lockfile
corepack pnpm dev
```

Open `http://localhost:5173` (the port is pinned). In another terminal:

```sh
cd web
corepack pnpm --filter @bitchord/extension build
```

Load `web/extension/.output/chrome-mv3` as an unpacked extension in Chromium,
or `web/extension/.output/firefox-mv3/manifest.json` as a temporary Firefox add-on.
The Podium Air development extension has its own public key/id, separate from
BitChord. Its default trusted origin is **only** `http://localhost:5173`.
No private signing key is stored. Internal `@bitchord/*` package names, storage
keys and bridge protocol identifiers intentionally remain compatible with upstream.

## Build and verify

From `web/`:

```sh
corepack pnpm typecheck
corepack pnpm test
corepack pnpm build:site
corepack pnpm --filter @bitchord/app preview --host 127.0.0.1 --port 5173
```

`build:site` packages both extension targets into ignored `app/public/downloads/`,
then builds `app/dist/`, including the versioned downloads manifest. The output
is local only; these commands do not deploy or publish anything.
`build` also builds all workspace packages, without packaging downloadable zips.

The web manifest provides standalone installation and PNG app icons. The production
service worker precaches only the build's static shell and lazy route chunks.
It supports offline navigation, **not offline music playback**. Media, account
requests, external services, API paths and extension downloads are not cached.
Worker updates wait until existing tabs close; a build cannot mix old/new chunks.
A future approved host must provide HTTPS and an SPA fallback to `index.html`.
The standard build uses `/`; the explicit Pages preview build uses `/Podium-Air/`.

## Configuration (no production host selected)

| Variable | Purpose |
| --- | --- |
| `PODIUM_AIR_SITE_ORIGINS` | Extension allowlist; comma-separated exact origins. Defaults to localhost only. Set explicitly before any future hosted build. |
| `BITCHORD_STORE_BUILD=1` | Upstream store-build switch, retained internally; requires explicit Podium Air origins. |
| `VITE_EXTENSION_ID_CHROMIUM` | Override the default local extension id for a future store build. |
| `VITE_EXTENSION_CHROME_URL`, `VITE_EXTENSION_FIREFOX_URL`, `VITE_EXTENSION_MANIFEST_URL` | Override extension downloads/update manifest links. |
| `VITE_ANDROID_APP_URL` | Android download destination; defaults to Podium Air releases. |

## Scope and upstream limitations

- Google login integration and reuse of Podium Air's native YouTube Music login
  are deferred. Upstream extension-based session detection is retained unchanged.
- YouTube playback/account access requires the companion extension. The installable
  shell does not remove that requirement. iOS/Safari playback is not ready.
- Spotify, some lyric sources and Apple Music public-page enrichment also depend
  on extension access. Live service compatibility is upstream-dependent.
- Listen Together still defaults to the upstream backend and invite domain;
  Discord retains the upstream application id. These are not Podium Air services.
- No authenticated user session or live playback is claimed as tested by import.
- SF Pro Display fonts are preserved to avoid changing the upstream lyrics layout;
  their distribution provenance needs review before a public release. Other
  dependencies and fixtures retain their own rights and licenses.

## Brand assets

The flat P is copied byte-for-byte from
`sharedUi/src/commonMain/composeResources/drawable/ic_logo.png` into
`app/public/logo-mark.png`. The app displays it with a red CSS mask. Favicon and
install/toolbar PNGs are mechanical red-tinted size exports of its alpha silhouette.
No generated artwork or glossy/chrome launcher variant is used. Existing Android
and desktop assets are untouched. Light/dark appearance, layout and motion are
retained, with a near-black page background in dark mode and the upstream red accents.

## GitHub Pages review build

The explicitly authorized preview uses the same repository, built from
`feat/official-pwa-integration` by `web-pages-preview.yml`; it does not merge the
PR or change the existing Cloudflare website. Enable **GitHub Actions** in the
repository's Pages settings before deployment can finish.

`pnpm build:pages` builds for `/Podium-Air/` with hash routing, so refreshes and
shared page links work on Pages without a server rewrite. Normal `build:site`
still builds the root-hosted app with browser routing. Public asset/download
paths and the service worker honor the selected base; manifest icons, scope and
start URL are relative. Cache cleanup is scoped to this base path.

The preview workflow trusts only `https://kaizen-flims.github.io` for its companion
extension build. The standard local build keeps its localhost-only default.
Google login and native YouTube Music integration remain deferred.

## Google integration development

The Google account and optional read-only owned-playlist connection is documented
in [docs/google-integration.md](docs/google-integration.md). It requires a registered
web OAuth client before activation; set the public client id through
`VITE_GOOGLE_CLIENT_ID` (Pages uses the `PODIUM_AIR_GOOGLE_CLIENT_ID` repository
variable). It does not replace the extension's YouTube Music playback session.
