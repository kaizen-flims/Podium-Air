# Google account and read-only YouTube playlists

This phase uses Google Identity Services' browser token client. It is independent
of the native/extension YouTube Music cookie session. It does not make the current
YouTube audio engine work without the companion extension.

## Why native sign-in cannot just be shared

Android `app/src/main/java/com/music/bitchord/auth/YtMusicLoginScreen.kt` loads
Google/YouTube Music in a WebView. On confirmation it reads `CookieManager` and
page configuration through `evaluateJavascript`. Desktop `DesktopWebSignIn.kt`
similarly owns a browser view. Shared `Innertube.kt` signs requests from session
cookies with SAPISIDHASH. Those are native capabilities, not an OAuth callback.
A page on `kaizen-flims.github.io` cannot read a YouTube page's cookies or DOM.
The imported web implementation delegates those requests to its browser extension.

## Implemented behavior

- Settings and the no-extension sidebar provide an independent Google connection.
- Sign-in requests `openid profile email`. Read-only YouTube permission is requested
  separately when the listener chooses **Connect YouTube library**.
- The browser uses Google's hosted account chooser/consent popup; Podium Air never
  asks for a Google password or copies Google session cookies.
- The account profile is read directly from Google's UserInfo endpoint. OAuth
  access tokens stay in module memory by default. The optional **Keep signed in
  in this tab** setting saves the short-lived token and its original expiry in
  sessionStorage, scoped to the OAuth client. Restoration verifies the token with
  Google UserInfo before showing account identity. Tokens never enter localStorage,
  URLs, query-cache data, cookies, logs, the repository or the service worker.
  Opting out, disconnect, expiry and rejected restoration delete the saved record.
  Browser storage failure falls back to memory-only login with a visible notice.
- `/google-library` lists **owned YouTube playlists** using `playlists.list` with
  `mine=true`, supports pagination and opens playlists in YouTube Music to listen.
  This is not the full YouTube Music library and does not promise saved playlists.
- Partial consent, blocked/cancelled popups, SDK failure, expiry, denied access and
  API failures have explicit states. Expiry/disconnect drops account state, cancels
  private library queries and removes their cache. Late replies cannot restore a
  disconnected or superseded account.
- No refresh token or backend session is created. Reload can reuse an opted-in
  tab connection until its original expiry; otherwise a user action is required.
  Browser session restore may retain tab storage, but never extends Google expiry. Disconnect is local to Podium Air and does not sign
  out of Google or revoke the app grant; access can be revoked in Google Account.
- When no client ID is configured, the UI says setup is pending and no Google SDK
  or user-data request is made. There is no dummy production client ID.

## Activation for the Pages preview

1. In an existing Google Cloud project owned by Prem, configure the OAuth consent
   app as **Podium Air**. Keep testing status for initial testers.
   Prem has since requested a public OAuth audience. Publishing the OAuth audience
   does not complete brand/sensitive-scope verification or merge these PRs.
   Public branding URLs on the existing Pages preview are:
   - Homepage: `https://kaizen-flims.github.io/Podium-Air/about.html`
   - Privacy: `https://kaizen-flims.github.io/Podium-Air/privacy.html`
   - Terms: `https://kaizen-flims.github.io/Podium-Air/terms.html`
   Use these together so the homepage and privacy policy share a domain. The
   homepage links both policies; Settings and Google connection controls also link
   them before authorization. These pages describe the web preview and optional
   extension, not the separate native apps. Brand verification/domain ownership
   and sensitive YouTube permission approval still need Google's review.
2. Create/use an OAuth **Web application** client. Authorized JavaScript origins:
   - `https://kaizen-flims.github.io` (origin only, not `/Podium-Air/` or a hash route)
   - `http://localhost` and `http://localhost:5173` for local development if needed.
3. Enable **YouTube Data API v3** in the same project for optional playlist access.
   Configure the basic profile scopes plus `youtube.readonly` and appropriate test
   users. Follow Google's consent/verification requirements before wider release.
4. Put only the public web client ID in the existing repository Actions variable
   `PODIUM_AIR_GOOGLE_CLIENT_ID`; the Pages workflow maps it to
   `VITE_GOOGLE_CLIENT_ID`. Local builds use `web/app/.env.local` (ignored).
   Never put a Google client secret, account token or cookie in a `VITE_*` variable.
5. Rebuild the authorized preview branch. Test a real account, optional consent,
   playlist loading, refresh, expiry, disconnect and Safari/PWA popup behavior.

This client-only popup flow does not use a custom OAuth redirect endpoint or put
responses in the Pages hash route. A future backend would need its own reviewed
session/refresh-token design; do not send this browser token to native cookie APIs.

## Verification and remaining limits

Unit tests exercise token handling, incremental scopes, partial/denied consent,
popup failure, invalid replies, expiry, disconnect races, stale account responses,
API errors, token redaction and playlist parsing. A mocked-provider React test
exercises the visible sign-in/consent/library/disconnect flow and cache removal.
Root and Pages builds retain the existing static-shell checks.

Live Google consent and Safari/iOS authorization cannot be verified without an
actual registered web client and consent configuration. No extension-free YouTube
Music playback, Automix parity, background audio, or native login reuse is claimed.
Existing Android, desktop and extension session implementations are unchanged.

References:
- https://developers.google.com/identity/oauth2/web/guides/use-token-model
- https://developers.google.com/identity/oauth2/web/reference/js-reference
- https://developers.google.com/identity/oauth2/web/guides/get-google-api-clientid
- https://developers.google.com/identity/openid-connect/openid-connect
- https://developers.google.com/youtube/v3/docs/playlists/list
- https://developer.mozilla.org/en-US/docs/Web/Security/Defenses/Same-origin_policy
