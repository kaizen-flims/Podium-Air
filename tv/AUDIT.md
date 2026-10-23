# TV import audit

Source: https://github.com/kushagrasinghx/BitChord/tree/edc1e6f36febf71a118e649411d2fc21b70ead45/tv

The source offers remote-first home, search, library, settings, lyrics, USB audio,
display refresh switching and spatial audio controls. Actual output depends on TV
hardware; these are inherited capabilities, not verified hardware guarantees.

The TV module depends on upstream Android sources and newer shared playback APIs.
A pinned runtime is isolated under tv/runtime instead of updating the existing
phone/desktop apps. Only the TV module consumes it. Original namespaces/native
library names remain for binary compatibility; public app identity is Podium Air.
Launcher uses the original Podium Air asset; in-app mark uses the approved Chrome
asset from the Android audit branch. Upstream credit remains in About and source.

Changes for audit distribution:
- Separate com.podium.air.tv.audit identity; version 0.1.0-tv-audit1.
- Optimized, non-debuggable release with development signing; production key unused.
- Update polling disabled; never offers BitChord or production phone APKs.
- Default upstream Listen Together server removed; requires explicit configuration.
- Phone pairing requires a random per-session token, rejects cross-origin requests,
  sets a same-site HttpOnly cookie, limits request sizes and times out stalled clients.
- Playback mutations require POST; wildcard CORS removed; async search now completes
  before its socket closes. Pairing token expires on dialog close/server stop.

Pairing remains local HTTP, not TLS. Only use a trusted network; session cookies
would travel unencrypted. On-TV sign-in is also inherited and needs device testing.
Do not claim QR pairing is an automatic Google OAuth flow: it accepts a copied
YouTube session cookie. No account credentials are stored in this repository.

Required real-TV audit: install/launch, D-pad focus and back, search typing, login,
playback/seek/queue, library, lyrics timing, output/volume, sleep/wake, USB permissions,
refresh-rate fallback, stereo/AV receiver behavior, paired/unpaired HTTP requests.
No real-TV runtime success is claimed by source import or CI compilation alone.
