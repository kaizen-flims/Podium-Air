# Branding audit

Checked source on 2026-10-14; built-artifact checks await CI.

| Platform | Source evidence | Status |
|---|---|---|
| Android identity | app/build.gradle.kts: com.podium.air; dev com.podium.air.dev; code 2/name 1.0.1 | Preserved by source check |
| Android signing/update | keystore loading unchanged; existing certificate workflow retained; AppUpdateChecker points to Podium | Source verified; signed upgrade untested |
| Android art/UI | existing launcher/mipmap PNG/WebP, notification mono, Prem footer; sharedUi ic_logo.png | Source verified; visual review pending |
| Shared translated branding | app values*/strings.xml, sharedUi composeResources values*, desktop strings/*.xml | XML parsed; duplicate keys removed; displayed BitChord strings absent |
| Windows installer | desktopApp/build.gradle.kts: Podium Air package/menu, existing Windows repo upgradeUuid | Source verified; EXE/MSI metadata pending |
| Windows shell/UI | Main.kt title, tray names, SMTC helper title, official AppIcon.ico, desktop Compose PNG logos | Source verified; startup/taskbar review pending |
| macOS bundle | bundleID com.podium.air.desktop, dockName Podium Air, AppIcon.icns | Source verified; plist/dock checks pending |
| Desktop sessions | preference nodes com.podium.air.desktop and .stats; isolated analyser/log dirs | Isolated from BitChord; old preview data migration unverified |
| Desktop updater | Podium repo, matching platform artifact required, macOS architecture suffixes | Source verified; network path untested |
| Legal notices | Android/desktop settings upstream credit, DesktopLicenses, LICENSE, THIRD_PARTY_NOTICES.md | Retained; dependency/asset clearance pending |

Internal `com.music.bitchord` Kotlin packages, Compose-generated resource
namespace, `BitChordIcons` symbols, JNI bindings, library filenames and existing
Android preference/schema/resource keys remain for source/ABI compatibility.
Upstream project URLs and names are appropriate in attribution. Upstream
DESKTOP.md/DESKTOP_RELEASES.md describe upstream releases; they must not be
presented as Podium download links. Fonts: new desktop SF Pro files are removed;
pre-existing Android assets still need license provenance review before release.

`tools/verify_identity.py` guards identifiers, updater destinations, translated
branding, XML uniqueness and conflict markers. Native CI checks inspect APK
badging, macOS plist and expected Windows/macOS analyser/model JAR entries.
Interactive screens, notifications, splash and installer visuals remain unverified.
