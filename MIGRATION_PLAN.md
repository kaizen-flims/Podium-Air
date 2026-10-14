# Integration plan and decisions

## Source and history

Merge pinned upstream `fe95bb60aa9cd205cf4ab8bd25a5bec71a595b4f` into Podium
`48902e6b20fdcfeb1723e02d4744849e82d5067a` on
`feat/upstream-three-platform-integration`. The merge retains both parents and
upstream author history. `AUDIT.md` and `docs/upstream-integration/comparison.json`
record the pre-merge comparison. No production branch or other repository is changed.

## Conflict decisions

- `app/build.gradle.kts`: keep Podium production/dev IDs, version code 2 and
  name 1.0.1, signing configuration; accept upstream module dependencies.
  Version bump and release authorization remain a separate review decision.
- `.github/workflows/android.yml`: retain Podium distribution/signing/certificate
  validation and main-only release gates. Change JDK from 17 to 21 because
  configuration now resolves the desktop Java 21 toolchain; Android bytecode stays 17.
- `README.md`: retain Podium README. Upstream build guide retained as DESKTOP.md
  pending product documentation cleanup; it describes upstream, not released Podium packages.
- `FrostedTopBar.kt`: retain Podium logo chrome and dev badge. Other new UI adapters
  are merged from upstream; runtime layout review is still required.
- `ReplayShareSheet.kt`: accept upstream configurable export prefix, use Podium
  default prefix and retained Podium gallery folder.
- `ReplayCard.kt`: use Compose resource API in the new shared UI source set;
  replace upstream artwork with official Podium monochrome artwork.
- `AccountAndScrobblingScreen.kt`: retain new grouped account/profile controls
  and reinstate Prem footer on signed-out account view.
- Conflicting default/Turkish/Vietnamese strings: include new upstream keys,
  retain Prem credit, remove duplicate keys, rebrand displayed values in all locales.
- Auto-merged updater, deep links, notification/export paths and media actions:
  preserve Podium routing; keep internal namespaces/preferences/database schema.
- Upstream workflow additions for releases, deploys, contributor/issue automation:
  excluded. The new preview workflow has read-only repository permissions, no
  keystore, no release API calls, and no deployment or merge steps.

## Desktop identity

Existing `kaizen-flims/Podium-Air-Windows-:app-desktop/build.gradle.kts` inspected
via GitHub. Keep its package/menu name `Podium Air`, vendor `Prem Das aka Kaizen`,
and upgrade UUID `2e06a9dc-fc0e-4f63-9232-ce7297e72cc2`. This is continuity of
installer identity, not a verified migration of its unrelated preview data format.
The old repository is untouched. macOS bundle ID `com.podium.air.desktop` is
new; no macOS product repository or prior bundle ID was found in the scoped repo search.

New desktop preferences/log/analyser directories are isolated from BitChord;
Android persisted keys are unchanged. The desktop updater uses Podium releases
and requires a matching platform asset, avoiding Android-only release prompts.
Official Podium PNG artwork is converted deterministically to ICO/ICNS and used
in Compose logos. New desktop SF Pro assets are omitted in favor of system sans.
Upstream legal credits remain in Android settings, desktop settings and legal screen.

## Verification and remaining work

1. Source identity/XML integrity and diff whitespace checks: run locally.
2. Android test/build first in GitHub Actions; independent dev application ID.
3. Windows tests and EXE/MSI/portable ZIP on Windows after Android build.
4. macOS tests and unsigned DMG/PKG/app ZIP on Apple Silicon and Intel runners.
5. Runtime startup/playback/embedded and provider lyrics/queue/cache/Automix/
   Google sign-in/media controls need real-device testing. CI packaging is not that test.
6. Signing/data-upgrade test for Android remains blocked without an authorized
   production-signed candidate; this PR must not publish one automatically.
7. Review third-party asset/native-code licenses before public distribution.

Local compilation cannot start: Gradle distribution download returned
`java.net.SocketException: Network is unreachable`; local JDK is 17, no Android
SDK or native Windows/macOS runtime is available. CI links/results are recorded
in VERIFICATION.md when actually available. Do not infer successful builds.

Follow-up CI fixes: obsolete SDK `tools` package removed; restored logo top-bar
imports; debug job concurrency cancels superseded push/PR builds without changing
the signed-release job. Corrected Chinese language labels and platform qualifiers
exposed by upstream Android tests. Live external Genius checks are opt-in and
must be reported separately from deterministic parser tests.
