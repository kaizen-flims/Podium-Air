# Changes in the integration branch (unreleased)

- Integrate real BitChord shared Kotlin/JVM logic, shared Compose UI and desktop
  implementation with upstream commit history, including Android adaptations.
- Include upstream v1.8 queue/cache/lyrics/playback/Automix changes plus later
  native macOS support, desktop WebView sign-in, shared Spotify library/importer,
  and isolation of download requests from sign-in cookies.
- Preserve Podium Android identifiers, signing configuration, updater, artwork,
  export labels and Prem account/settings footer.
- Apply Podium desktop display names, official icons, Windows installer UUID,
  isolated preferences, macOS bundle ID and Podium release lookup. Desktop update
  prompts require a matching installer asset, including architecture-specific macOS assets.
- Add preview-only Android, Windows and macOS CI and machine-readable ancestry/file audit.
- Retain GPL and upstream attribution. Use system sans for newly imported desktop UI.
- Normalize one upstream test file from Windows-1252 to UTF-8 and remove resource
  duplicates introduced by the branding merge.

- Fix inherited Android locale coverage and orphaned localized resources; keep live
  lyrics scraping opt-in and report it separately from deterministic tests.
- Adapt Intel macOS ONNX runtime/model weight representation with SHA-256
  provenance and exact effective-weight verification; retain original assets
  on Android, Windows and Apple Silicon. Require native/model initialization
  in the desktop Automix test instead of silently returning on failure.

No release, default-branch merge, website change or existing-repository deletion.
Build and runtime status is documented separately; these source changes are not
claims of full feature parity or production readiness.
