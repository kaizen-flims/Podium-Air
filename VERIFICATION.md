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
