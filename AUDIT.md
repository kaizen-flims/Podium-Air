# Upstream integration audit

Audited 2026-10-14. Exact source comparison, before integration.

| Reference | SHA |
|---|---|
| Podium Air main | `48902e6b20fdcfeb1723e02d4744849e82d5067a` |
| BitChord main | `fe95bb60aa9cd205cf4ab8bd25a5bec71a595b4f` |
| Latest non-prerelease Android tag v1.8 | `32f4e7c5f06d0f62ea14a15111a4c32d6d10ac3c` |
| Common ancestor | `fe198ac0bde052f8b84cfd84b1d271f8f1fcc7b2` |

Podium Air has six commits after the ancestor. Upstream adds `shared`, `sharedUi`, `desktopApp`; Podium Air currently includes only `app` and the Go backend. The JSON report lists every different blob, missing file, overlapping change and candidate classification, plus upstream commit subjects. These are candidate classifications; resolutions are recorded in MIGRATION_PLAN.md.

## Comparison counts

- SAFE MERGE: 711
- NOT APPLICABLE: 7
- PODIUM AIR OVERRIDE: 35
- NEEDS ADAPTATION: 29
- Missing upstream paths: 525

## Base decision

v1.8 is the stable Android reference, while desktop artifacts are explicitly beta. Integrate the pinned upstream main SHA with history preserved: after v1.8 it adds native macOS support (203c20f), the current Intel runner (dd8f7c7), cross-platform credential-store fix (e2b992b), desktop WebView login (41198be), shared Spotify library/importer (31587cb, af215da, 8641d63), and isolated download cookies (47bd5c5). Importing just the tag omits this linked desktop work. Main also reverts the recent lyrics positioning change (fe95bb6); retain that revert. This is an integration candidate, not a production-ready claim.

## Confirmed source changes

- `shared/src/jvmSharedMain`: network clients, stream resolution, lyrics providers, Spotify library, Automix analysis and queue models moved to shared JVM code.
- `sharedUi/src/jvmSharedMain`: real player, lyrics, browsing and shared Compose components; Android platform adapters remain in androidMain.
- `desktopApp/src/main`: desktop audio/FFmpeg, queue, downloads, local library, auth, browser/WebView sign-in, Windows native frame and media session, macOS audio/media support.
- `app`: source adapters and upstream queue/cache/lyrics/Automix/player fixes, with TV/cast additions already coupled into upstream. Android app IDs and Podium customizations must survive the merge.
- `build.gradle.kts`, module build scripts, `settings.gradle.kts`: Kotlin 2.3.20 and Compose Multiplatform 1.10.3, AGP 8.10.1; desktop JDK 21, Android target JVM 17. Module source sets are JVM-backed KMP, not Kotlin/Native or a separate web clone.

## Overlapping changes requiring review

- `.github/workflows/android.yml`
- `README.md`
- `app/build.gradle.kts`
- `app/src/main/AndroidManifest.xml`
- `app/src/main/java/com/music/bitchord/data/LocalMediaRepository.kt`
- `app/src/main/java/com/music/bitchord/data/TrackLog.kt`
- `app/src/main/java/com/music/bitchord/playback/PlaybackService.kt`
- `app/src/main/java/com/music/bitchord/ui/components/FrostedTopBar.kt`
- `app/src/main/java/com/music/bitchord/ui/replay/ReplayCard.kt`
- `app/src/main/java/com/music/bitchord/ui/replay/ReplayPoster.kt`
- `app/src/main/java/com/music/bitchord/ui/replay/ReplayShareSheet.kt`
- `app/src/main/java/com/music/bitchord/ui/replay/ReplayStories.kt`
- `app/src/main/java/com/music/bitchord/ui/screens/AccountAndScrobblingScreen.kt`
- `app/src/main/java/com/music/bitchord/ui/screens/SettingsSheet.kt`
- `app/src/main/res/values-de/strings.xml`
- `app/src/main/res/values-es/strings.xml`
- `app/src/main/res/values-fr/strings.xml`
- `app/src/main/res/values-he/strings.xml`
- `app/src/main/res/values-hi/strings.xml`
- `app/src/main/res/values-id/strings.xml`
- `app/src/main/res/values-it/strings.xml`
- `app/src/main/res/values-ja/strings.xml`
- `app/src/main/res/values-pl/strings.xml`
- `app/src/main/res/values-pt/strings.xml`
- `app/src/main/res/values-ru/strings.xml`
- `app/src/main/res/values-th/strings.xml`
- `app/src/main/res/values-tr/strings.xml`
- `app/src/main/res/values-vi/strings.xml`
- `app/src/main/res/values-zh/strings.xml`
- `app/src/main/res/values/strings.xml`

## Podium overrides at risk

Application ID `com.podium.air`, dev ID `com.podium.air.dev`, v1.0.1/code 2; signing properties and certificate validation; Podium GitHub updater; deep-link scheme/hosts; notification and export naming; official artwork; account/settings Prem footer; branding translations. Internal Kotlin namespaces and persisted preference/database keys must remain to preserve compatibility.

## Licenses and prerequisites

Root LICENSE is GPLv3. Retain upstream copyright, source history and dependency legal notices. Binary asset provenance and third-party distribution rights (especially bundled SF Pro fonts, models, JavaFX, ONNX and FFmpeg codec binaries) need review before public release; copying assets does not establish permission. Desktop packaging currently uses SF Pro from upstream, subject to its own license; do not describe it as cleared.

Android needs an SDK including upstream compileSdk and NDK, CMake, Gradle and JDK. Windows packaging needs Windows, JDK 21, CMake/MSVC (WinRT SMTC) and jpackage/WiX. macOS needs a native runner, JDK 21, CMake, bundled native dependency checks, and optional Apple signing/notarization credentials. This container has only JDK 17 and no detected Android SDK, Windows or macOS runtime. CI builds and interactive tests must be reported separately.
