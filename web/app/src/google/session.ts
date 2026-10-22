/** Browser-only Google authorization. Tokens stay in this module's memory. */
export const BASIC_SCOPES = 'openid profile email';
export const YOUTUBE_SCOPE = 'https://www.googleapis.com/auth/youtube.readonly';
const USERINFO = 'https://openidconnect.googleapis.com/v1/userinfo';
export interface GoogleProfile { sub: string; name: string; email: string | null; picture: string | null }
export interface GoogleState {
  status: 'unconfigured' | 'loading' | 'signed-out' | 'authorizing' | 'signed-in' | 'error' | 'expired';
  profile: GoogleProfile | null;
  youtube: boolean;
  revision: number;
  error: string | null;
}
export interface TokenResponse { access_token?: string; expires_in?: number; scope?: string; error?: string }
interface TokenClient { requestAccessToken(options: { prompt: string; hint?: string }): void }
export interface GoogleOAuth {
  initTokenClient(config: {
    client_id: string; scope: string; include_granted_scopes: boolean;
    callback: (response: TokenResponse) => void;
    error_callback: (error: { type: string }) => void;
  }): TokenClient;
}
export class GoogleSession {
  private state: GoogleState;
  private token: { value: string; expiresAt: number } | null = null;
  private listeners = new Set<() => void>();
  private epoch = 0;
  private timer: ReturnType<typeof setTimeout> | undefined;
  private sdk: GoogleOAuth | null = null;
  private loading: Promise<void> | null = null;
  constructor(
    readonly clientId: string,
    private loadSdk: () => Promise<GoogleOAuth>,
    private fetcher: typeof fetch = (...args) => fetch(...args),
    private now = () => Date.now(),
  ) {
    this.state = { status: clientId ? 'loading' : 'unconfigured', profile: null, youtube: false, revision: 0, error: null };
  }
  getSnapshot = (): GoogleState => this.state;
  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => { this.listeners.delete(listener); };
  };
  private publish(patch: Partial<GoogleState>) {
    this.state = { ...this.state, ...patch };
    this.listeners.forEach((listener) => listener());
  }
  prepare(): Promise<void> {
    if (!this.clientId || this.sdk) return Promise.resolve();
    if (this.loading) return this.loading;
    this.publish({ status: 'loading', error: null });
    this.loading = this.loadSdk().then((sdk) => {
      this.sdk = sdk;
      this.publish({ status: 'signed-out', error: null });
    }).catch(() => {
      this.publish({ status: 'error', error: 'Google sign-in could not load. Check your connection and try again.' });
    }).finally(() => { this.loading = null; });
    return this.loading;
  }
  /** Called synchronously from a click so popup browsers retain user activation. */
  authorize(youtube = false): void {
    if (!this.clientId || !this.sdk || this.state.status === 'authorizing') return;
    const epoch = ++this.epoch;
    const previous = this.state.profile;
    const onError = (message: string) => {
      if (this.epoch !== epoch) return;
      if (this.token && this.token.expiresAt > this.now()) this.publish({ status: 'signed-in', error: message });
      else {
        this.clearToken();
        this.publish({ status: 'signed-out', profile: null, youtube: false, revision: this.state.revision + 1, error: message });
      }
    };
    this.publish({ status: 'authorizing', error: null });
    let received = false;
    try {
      const client = this.sdk.initTokenClient({
        client_id: this.clientId,
        scope: youtube ? `${BASIC_SCOPES} ${YOUTUBE_SCOPE}` : BASIC_SCOPES,
        include_granted_scopes: true,
        callback: (response) => { if (received) return; received = true; void this.accept(response, epoch, onError); },
        error_callback: (error) => onError(error.type === 'popup_closed'
          ? 'Sign-in was cancelled. Your existing connection has not changed.'
          : error.type === 'popup_failed_to_open'
            ? 'Allow popups for Podium Air, then try again.'
            : 'Google sign-in could not finish. Please try again.'),
      });
      // Incremental permissions stay on the current account; a fresh login offers selection.
      client.requestAccessToken({ prompt: youtube && previous ? 'consent' : 'select_account',
        ...(youtube && previous ? { hint: previous.sub } : {}) });
    } catch {
      onError('Google sign-in could not start. Please try again.');
    }
  }
  private async accept(response: TokenResponse, epoch: number, onError: (message: string) => void) {
    if (this.epoch !== epoch) return;
    if (response.error || !response.access_token || !Number.isFinite(response.expires_in) || Number(response.expires_in) <= 0) {
      onError(response.error === 'access_denied' ? 'Access was not granted. You can try again whenever you are ready.' : 'Google did not return a valid sign-in. Please try again.');
      return;
    }
    const expiresAt = this.now() + Math.min(Number(response.expires_in), 86400) * 1000;
    const token = response.access_token;
    try {
      const result = await this.fetcher(USERINFO, { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store', credentials: 'omit', redirect: 'error' });
      if (!result.ok) throw new Error('profile');
      const data: unknown = await result.json();
      if (this.epoch !== epoch) return;
      if (!data || typeof data !== 'object' || !('sub' in data) || typeof data.sub !== 'string' || !data.sub || expiresAt <= this.now()) throw new Error('profile');
      const fields = data as Record<string, unknown>;
      const profile: GoogleProfile = {
        sub: data.sub, name: typeof fields.name === 'string' && fields.name ? fields.name : 'Google account',
        email: typeof fields.email === 'string' ? fields.email : null,
        picture: safePicture(fields.picture),
      };
      if (this.timer) clearTimeout(this.timer);
      this.token = { value: token, expiresAt };
      const scopes = new Set((response.scope ?? '').split(/\s+/));
      this.publish({ status: 'signed-in', profile, youtube: scopes.has(YOUTUBE_SCOPE), revision: this.state.revision + 1, error: null });
      this.timer = setTimeout(() => this.expire(), Math.max(0, expiresAt - this.now()));
    } catch {
      onError('Google authorized the request, but your account could not be read. Please try again.');
    }
  }
  signOut(): void {
    this.epoch++;
    this.clearToken();
    this.publish({ status: this.clientId ? 'signed-out' : 'unconfigured', profile: null, youtube: false, revision: this.state.revision + 1, error: null });
  }
  private clearToken() { if (this.timer) clearTimeout(this.timer); this.timer = undefined; this.token = null; }
  private expire() {
    this.epoch++;
    this.clearToken();
    this.publish({ status: 'expired', profile: null, youtube: false, revision: this.state.revision + 1, error: 'Your Google connection expired. Sign in again to continue.' });
  }
  /** Only fixed Google API paths are accepted; tokens cannot be sent to arbitrary hosts. */
  async youtubeGet(path: 'playlists' | 'playlistItems', params: Record<string, string>, signal?: AbortSignal): Promise<unknown> {
    if (path !== 'playlists' && path !== 'playlistItems') throw new Error('Unsupported YouTube request.');
    const token = this.token;
    const revision = this.state.revision;
    if (!token || token.expiresAt <= this.now()) {
      if (token) this.expire();
      throw new Error('Sign in to Google again to continue.');
    }
    if (!this.state.youtube) throw new Error('Connect your YouTube library first.');
    const url = new URL(`https://www.googleapis.com/youtube/v3/${path}`);
    for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value);
    const response = await this.fetcher(url.href, { headers: { Authorization: `Bearer ${token.value}` }, cache: 'no-store', credentials: 'omit', redirect: 'error', ...(signal ? { signal } : {}) });
    if (this.token !== token || this.state.revision !== revision) throw new Error('Your Google account changed. Please reload the library.');
    if (response.status === 401) { this.expire(); throw new Error('Your Google connection expired. Sign in again.'); }
    if (!response.ok) throw new Error(response.status === 403
      ? 'YouTube could not share this library. Check that access was granted and that the app’s YouTube API is enabled and has available quota.'
      : 'Your YouTube library could not load. Please try again.');
    const data: unknown = await response.json();
    if (this.token !== token || this.state.revision !== revision || token.expiresAt <= this.now()) throw new Error('Your Google account changed. Please reload the library.');
    return data;
  }
}
function safePicture(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  try { const url = new URL(value); return url.protocol === 'https:' ? url.href : null; } catch { return null; }
}
