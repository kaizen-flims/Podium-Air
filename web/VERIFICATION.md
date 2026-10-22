# PWA integration verification

Audited 22 October 2026 against Podium Air `0e2444e5d98b900ce4a958a171c87570bdda778e`
and BitChord `edc1e6f36febf71a118e649411d2fc21b70ead45` (official default branch).

## Scope

Imported the complete independent `web/` workspace, including its TypeScript
shared bridge, extension, fixtures, docs and pinned lockfile. No upstream Kotlin,
Gradle, backend, Android or desktop code was copied over Podium Air modules.
All pre-existing files are byte-for-byte unchanged except the added web notice
in `THIRD_PARTY_NOTICES.md`. A separate `web-ci.yml` only checks/builds and
uploads a preview artifact; it has no deployment or release step.

## Results

| Check | Result |
| --- | --- |
| Node 24.19.0; pinned pnpm 12.11.2 frozen install | Passed; no lockfile changes |
| Workspace TypeScript checks (app, shared, extension) | Passed |
| Upstream Vitest suite | 9 files, 119 tests passed |
| Chromium extension build/package | Passed |
| Firefox extension build/package | Passed |
| Vite production web build | Passed |
| `node scripts/check-pwa.mjs` | Passed: precache assets exist, manifest, offline SPA fallback, API/download/media exclusions and cache isolation |
| Headless Chromium, desktop 1440×1000 and mobile 390×844 | Passed: Settings, Home, Search, Library, Extension and not-found routes; branding/credits; no uncaught page errors or mobile horizontal overflow |
| Real service-worker activation and offline `/settings` deep-link reload | Passed in Chromium with network disabled |
| Existing Android/desktop/shared source and Gradle files | Unchanged by tree comparison |
| Local native compilation | Blocked before compilation: Gradle wrapper distribution download failed with `Network is unreachable`; no Android SDK installed and only JDK 17 available (native CI uses 21) |

Browser smoke checks exercised the shell without any signed-in account; external
requests were blocked. Live playback, session access, extension installation in a
user's browser, Spotify, Discord, Listen Together and Safari/iOS were not verified.
Fixture/parser tests do not establish that remote services work today. Installing
the shell does not make upstream extension-only playback work on iOS. No native
build success is claimed from source isolation alone.

The production build retains upstream nonfatal bundle-size warnings (HLS,
YouTube and Shaka chunks exceed 500 kB) and a mixed static/dynamic queue import.
They do not block compilation. Upstream fixtures/source retain original formatting.

No Google login implementation, native authentication changes, deployment,
production release or merge is part of this branch.

## GitHub Pages follow-up

The user subsequently authorized GitHub Pages hosting for a review preview.
Added a branch-only Pages publishing workflow and an explicit `pages` build mode
for `/Podium-Air/`, with hash routes, base-aware assets/downloads/service worker,
relative manifest URLs, and cache cleanup isolated by base path. No Google login
or native module changes were added. Normal root-hosted build remains supported.

Both root and Pages builds and their output checks passed; TypeScript checks and
all 119 upstream tests passed again. The Pages subpath was also exercised in
headless Chromium with static-only serving, including hash navigation and an
offline reload. Publishing still requires Pages to be enabled in repository
settings and the deployment workflow to finish; no live URL is claimed here.
