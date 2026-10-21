# Android v1.8.1 integration audit

## Pinned source

- Podium Air starting commit: eddeb7f (production v1.0.2).
- BitChord release: v1.8.1, commit 7d956f211b8a46a87184fd3ff87432b51a111dfa, published 19 October 2026.
- Feature-only integration on a separate review branch. No merge or release is authorized by this change.

## Imported behavior

Android player controls/output-device pill/source quality badge/song information, album and playlist pages, local/download album and artist groups, weekly Replay, addon search, search privacy/actions, bounded queues and shuffle history, lyrics/RTL/share fixes, Spotify sign-in/import/download fixes, persistent offline cache, uploaded tracks, Samsung lossless output detection, equalizer peak limiter, profile PIN protection, sign-out cleanup, navigation and Listen Together reconnect/health fixes.

Android relies on shared and sharedUi, so their matching changes are included. Desktop source, desktop packaging, backend deployment, TV, web and watch APK modules are excluded. Phone-side watch adapters and a copy of the matching protocol are required by the new player; the watch install row stays hidden because no watch APK is bundled. No watch product is being released.

## Preserved identity and approval boundary

Production application ID, version, signing configuration, existing launcher assets, in-app logo assets, existing credits/Prem attribution and notices are preserved. Existing Podium resource keys and Discord identity/fallback art remain compatible. Newly introduced visible strings use the existing Podium Air name. Upstream icon aliases, icon assets and icon picker are excluded.

Pending separate branding approval: the exact supplied Original, Liquid Glass and Chrome assets; three launcher choices with Original as default; Chrome throughout the app; larger top-left Chrome logo. None is applied in this PR.

## Install beside production

Use the `podium-air-android-audit` workflow artifact, containing `Podium-Air-Audit-v1.8.1.apk` and its SHA-256, manifest and signing reports. Do not install a production APK for this audit.

- Gradle variant: prodAudit (R8 enabled, non-debuggable, release fallback).
- Package: com.podium.air.audit; label: Podium Air Audit.
- Uses the Android test signing key, never the production certificate or release secrets. CI caches this separate test key for repeat audit installs. If the cache is lost the audit app alone may need reinstallation; production remains separate.
- Private preferences, login, database and cache belong to the audit package. It starts fresh; production data is not migrated or deleted.
- FileProvider authorities derive from applicationId, preventing provider installation conflicts.
- Audit update polling is disabled; audit builds come from PR artifacts.
- Both apps can see shared device audio and the public Music/Podium Air folder. Do not use destructive public-download/library actions while auditing music you want to retain.

The production variant is still compiled unsigned for build validation, but no installable production artifact or public release is published by the PR workflow.

## Verification

Local: identity/XML/resource checks, protected asset/notice hashes, audit isolation checks, Android string-reference check and Intel model helper pass. Gradle execution cannot download its distribution in this workspace (network denied); compilation, Android tests, desktop/shared compatibility and packaged-APK checks run in GitHub Actions. Device playback, login, offline mode and UI audit remain manual checks after the artifact is available. CI results are authoritative for compilation, not a substitute for device testing.

Suggested device audit: install alongside production; confirm both launch and production retains its account/playlists; exercise Google/Spotify sign-in, stream/local/offline playback, downloads, queue/shuffle/repeat/crossfade/Automix, lyrics/RTL/share, album/artist navigation, Replay, profiles, output routing and widgets. Artwork and credits should retain current Podium Air branding.
