# Podium Air Safari developer port

Experimental, unsigned WebExtension resources for macOS Safari and iOS/iPadOS Safari.
This ZIP is **not** an installable iPhone extension or a signed Mac application.
No Safari account access, Home feed or playback success has been verified yet.
The Chrome/Firefox packages remain the existing working paths.

## Package on a Mac

1. Install full Xcode and select it as the active developer directory.
2. Extract this download. In Terminal, change into the folder containing
   `manifest.json` and run `sh package-safari.sh`.
3. The script uses Apple's `safari-web-extension-packager` (or the older
   `safari-web-extension-converter`) to generate a containing app/Xcode project
   for macOS and iOS. It does not sign, install or upload anything.
4. Open the generated project in Xcode. Set your signing team on the app and
   extension targets; choose the Mac or iPhone/iPad scheme and build/run it.
   For a real iPhone, use your own signing/development provisioning. Distribution
   to other users requires Apple-supported signing and distribution.
5. Enable Podium Air in Safari's Extensions settings. Allow access only to your
   Podium Air website and the providers you use. Sign into music.youtube.com in
   the **same Safari profile**, then open Podium Air in a normal Safari tab.
   On the review build, the allowed website is https://kaizen-flims.github.io.
   Local builds default to http://localhost:5173 instead.
6. Confirm Extension status says Safari, then verify profile/channel selection,
   full Home, library, search, one complete track, seeking, queue advance,
   logout/account switching, refresh and background/lock-screen behavior.
   Test iOS and macOS separately. Home Screen standalone mode is unverified;
   Safari tab success must not be reported as standalone PWA success.

## Compatibility changes

- Uses a content-script page relay rather than Chrome's pinned extension ID.
- Requests Safari's `declarativeNetRequestWithHostAccess` permission.
- Omits Chromium manifest key and Firefox-only manifest fields.
- Does not depend on `cookies.onChanged`, unsupported in Safari. Explicit account
  reads refresh cached identity instead. No credentials cross the page bridge.
- Omits the custom X-Origin DNR request-header edit that Safari rejects;
  signed requests still set X-Origin directly in the extension request.
- Discord automation is excluded from this initial Safari build.

## Known blockers and verification limits

WebKit reports differences in DNR header support, notably modification of
requests initiated by the extension itself (bug 253696). Signed YouTube/Spotify
requests rely on those changes. Packaging success does **not** establish that
these features work in Safari. No workaround for this runtime issue is claimed.
If a device test encounters it, capture the browser/version and redacted error;
do not upload session cookies, tokens, request Authorization headers or passwords.
Safari may suspend background extension execution and media, especially on iOS.
The minimum working Safari/iOS version has not yet been established.

Built on BitChord; GPLv3 and attribution are included in this package.

References:
- https://developer.apple.com/documentation/safariservices/packaging-a-web-extension-for-safari
- https://developer.apple.com/documentation/safariservices/assessing-your-safari-web-extension-s-browser-compatibility
- https://developer.apple.com/documentation/safariservices/blocking-content-with-your-safari-web-extension
- https://bugs.webkit.org/show_bug.cgi?id=253696
- https://bugs.webkit.org/show_bug.cgi?id=290922
- https://wxt.dev/guide/essentials/publishing
