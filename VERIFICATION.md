# Verification status

Code under review: `fdb459cd999da9a03858b40ba39c9e8043dce988`.
Any following documentation-only commit does not change these tested sources.

[Platform preview run 38621132271](https://github.com/kaizen-flims/Podium-Air/actions/runs/38621132271)

| Platform | Unit tests / build | Packaging / identity | Status |
|---|---|---|---|
| Android | dev unit tests, dev APK, unsigned production/R8 APK | AAPT production/dev package and Podium label | PASS |
| Windows x64 | shared, shared UI and desktop tests; EXE/MSI/app image | Podium launcher; native media/analyser DLLs and models; portable ZIP | PASS |
| macOS arm64 | shared, shared UI and desktop tests; DMG/PKG/app | bundle ID; native analyser and models | PASS |
| macOS x64 | same tests/packages; Intel model adapter | same bundle checks | PASS |


## Review downloads

GitHub artifact downloads contain a ZIP wrapper; extract the named APK/installer.
These are preview artifacts, not published releases. Sign in to GitHub to download.

- [Android dev APK (separate app ID)](https://github.com/kaizen-flims/Podium-Air/actions/runs/38621132271/artifacts/11922034212)
- [Android unsigned production APK (review only)](https://github.com/kaizen-flims/Podium-Air/actions/runs/38621132271/artifacts/11921619467)
- [Windows x64 setup EXE](https://github.com/kaizen-flims/Podium-Air/actions/runs/38621132271/artifacts/11922133561)
- [Apple Silicon macOS DMG](https://github.com/kaizen-flims/Podium-Air/actions/runs/38621132271/artifacts/11922338367)
- [Intel macOS DMG](https://github.com/kaizen-flims/Podium-Air/actions/runs/38621132271/artifacts/11921654414)

All formats, report artifacts, sizes, archive SHA-256 digests and expiry dates
are recorded in `docs/upstream-integration/build-artifacts.json`. Those hashes
identify the uploaded ZIP archives, not each extracted installer.

## Local checks

- PASS: `python3 tools/verify_identity.py`: app IDs, updater destinations, internal
  session/bridge identifiers, visible translated branding, XML resource uniqueness,
  default resource coverage, conflict markers and desktop metadata.
- PASS: `python3 tools/test_intel_beat_model.py`: actual source-model protobuf
  round trip, deterministic conversion, unchanged unrelated graph fields and
  original initializers, and exact effective integer weights for all four
  adapted ConvInteger nodes. Original asset SHA-256 remains unchanged.
- PASS: `git diff --check`.
- PASS, LIMITED: no private-key/GitHub-token patterns in changed text files and
  no added keystores/certificates. This is not a comprehensive secret audit.
- BLOCKED LOCALLY: Gradle distribution network access, Android SDK and native
  Windows/macOS environments. Builds above run on GitHub Actions, not locally.

## Verification limits and release blockers

- NOT TESTED interactively: startup/UI/artwork, playback, queue, offline/cache,
  lyrics providers, Google/Spotify account sessions, desktop permissions and
  media controls. Unit/native initialization tests do not establish these flows.
- NOT TESTED: upgrade from the currently installed production Android app,
  including existing database/preferences/cache/session continuity. Source IDs,
  signing configuration and persisted keys are retained; real-device migration
  needs a reviewed production-signed candidate.
- NOT PROVIDED: production Android signing in preview CI. Its production APK is
  unsigned and cannot update installed users. The dev APK uses a separate ID.
- NOT PROVIDED: macOS signing/notarization or Windows publisher signing. Native
  packages are previews; platform installation prompts are expected.
- NOT CLEARED: provenance/distribution rights for existing Android fonts/models
  and all bundled native/transitive components. New desktop SF Pro assets were
  removed. Review THIRD_PARTY_NOTICES.md before public distribution.
- NOT TESTED: full inference-output parity of the Intel-derived model, real-track
  Automix quality and performance. Its integer weight equivalence is checked,
  while the strict desktop test must also load the native analyser and ONNX model.
- LIVE LYRICS: upstream's Genius network test is opt-in via
  RUN_LIVE_LYRICS_TESTS=true / manual run_live_lyrics_checks. Default CI reports
  one SKIPPED test. Four deterministic parser tests stay enabled. Provider
  availability remains a release check.

## Failures resolved during integration

- Upstream Android Check run 38083493418 had 18 locale/live-network failures.
  Corrected actual Chinese translations/platform locale qualifiers and separated
  the opt-in network check; no blanket test disablement.
- Restored retained Podium FrostedTopBar imports after CI compilation failure.
- First Podium suite executed 971 tests, with five old branding expectations
  failing and one live check skipped. Updated scheme/vendor/error expectations
  to the intended Podium values while preserving behavioral assertions.
- Upstream release run 38083493408 exposed six orphaned Chinese localized strings;
  subsequent Podium release lint exposed two Vietnamese duplicates. Removed only
  inactive Android remnants; active Compose translations remain. No lint baseline.
- Intel ONNX 1.29 initialization failed. Intel-only 1.20 initialized but rejected
  signed ConvInteger weights. Preserve original assets and use the mathematically
  equivalent UINT8 weight/zero-point encoding described in MIGRATION_PLAN.md.
- Removed the inherited model test's early return on missing native support,
  which could otherwise report a false success. Full nested failures are logged.

Earlier Android dev APK run 38609296171 succeeded. Windows and Apple Silicon
packaging succeeded in runs 38609296204, 38613145225 and 38616090777; those old
results are not substituted for the stricter final run above.

The preview workflow has read-only repository permissions and no release,
website deployment or merge steps. Default-branch release gates are unchanged.
