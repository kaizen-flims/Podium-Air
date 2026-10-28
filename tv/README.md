# Podium Air TV audit

Experimental Android TV / Google TV port. Android 8+; ARMv7, ARM64 and x86_64.
This is not a Samsung Tizen, LG webOS, Roku or Apple TV application.

Build: `bash gradlew -PpodiumTv=true :tv:testDevReleaseUnitTest :tv:assembleDevRelease` with Android SDK 37 and JDK 21.
Install the universal APK. The audit package is `com.podium.air.tv.audit`, version
`0.1.0-tv-audit1`. It installs beside the phone app and is a non-debuggable,
R8-optimized release signed with a development identity, never the production key.

TV screens are under `src/`. `runtime/` is a pinned copy of the upstream Android,
shared, sharedUi and native support code required by those screens. It is isolated
from Podium Air's existing phone and desktop modules; this avoids an unrelated
upgrade of those apps while auditing TV. Root projects `:tvShared` and `:tvSharedUi`
point here. Future updates must review and refresh the snapshot deliberately.

Upstream: kushagrasinghx/BitChord, commit edc1e6f36febf71a118e649411d2fc21b70ead45.
Original TV work credited to Nithyanantha; upstream creator Kushagra Singh. GPL-3.0,
with upstream notices retained. Podium Air adaptation by Prem.

See [AUDIT.md](AUDIT.md) for reviewed behavior, changes and remaining runtime checks.
