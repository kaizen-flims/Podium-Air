# Verification status

- PASS: local `python tools/verify_identity.py` (identity, XML resource uniqueness,
  displayed resource branding and merge-marker checks).
- PASS: local `git diff --check` after cleanup.
- PASS (limited scan): no private-key/GitHub-token patterns in changed text files,
  no added keystore/certificate files. This is not a comprehensive secret audit.
- BLOCKED: local Gradle cannot download its distribution (`Network is unreachable`).
  No Android APK, Windows installer or macOS distribution has built locally.
- PENDING: preview CI; native packaging and unit tests must finish before claiming success.
- NOT TESTED: device playback, lyrics, queue, cache/offline, Automix, account
  sessions, media controls, desktop startup, signed Android data upgrades.
- NOT PROVIDED: macOS signing or notarization. Any CI package is an unsigned preview.

Preview workflow: `.github/workflows/platform-preview.yml`. It performs no
publishing, signing, deployment or merge. See MIGRATION_PLAN.md for prerequisites.

## Inherited upstream test status and integration fixes

At upstream SHA fe95bb6, Check run 38083493418 passed Windows, macOS, Linux
and Go jobs, but Android failed 18 tests: missing Chinese language labels/
regional locale declarations and one live Genius scrape. These are not Podium
runtime validations. Podium run 38607316243 reached Kotlin compilation and found
missing imports in retained FrostedTopBar; restored those imports.

Add real translated Chinese language labels, declare zh-CN/zh-TW in Android
locale config while retaining legacy zh, and make locale coverage tests use the
actual Android resource qualifiers (zh and zh-rTW). The fixed Prem product
credit is explicitly non-translatable. Python confirms coverage for all catalogs.

The four deterministic Genius parser tests remain enabled. The live provider
scrape is opt-in with RUN_LIVE_LYRICS_TESTS=true (preview workflow manual input
run_live_lyrics_checks). Default CI reports it SKIPPED, not passed. Its network
behavior remains unverified; provider availability must still be tested before release.
