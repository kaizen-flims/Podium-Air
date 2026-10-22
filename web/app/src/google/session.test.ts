import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { BASIC_SCOPES, GoogleSession, YOUTUBE_SCOPE, type GoogleOAuth, type TokenResponse } from './session';
const response = (data: unknown, status = 200) => new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } });
function fixture() {
  let options: Parameters<GoogleOAuth['initTokenClient']>[0];
  const requestAccessToken = vi.fn();
  const sdk = { initTokenClient: vi.fn((input) => { options = input; return { requestAccessToken }; }) } satisfies GoogleOAuth;
  const fetcher = vi.fn<typeof fetch>().mockResolvedValue(response({ sub: 'account-a', name: 'Prem', email: 'prem@example.test', picture: 'https://example.test/photo' }));
  const session = new GoogleSession('test-web-client', async () => sdk, fetcher);
  return { session, sdk, fetcher, requestAccessToken,
    grant: (overrides: Partial<TokenResponse> = {}) => options.callback({ access_token: 'test-private-token', expires_in: 3600, scope: BASIC_SCOPES, ...overrides }),
    popupError: (type: string) => options.error_callback({ type }) };
}
const settle = async () => { await vi.waitFor(() => {}); await new Promise<void>((r) => queueMicrotask(r)); };
describe('Google browser authorization', () => {
  beforeEach(() => { vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'Date'] }); });
  afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks(); });
  it('makes no SDK or account requests until configured', async () => {
    const load = vi.fn(); const session = new GoogleSession('', load);
    await session.prepare(); session.authorize();
    expect(session.getSnapshot().status).toBe('unconfigured'); expect(load).not.toHaveBeenCalled();
  });
  it('starts a user-triggered account picker and asks for basic profile only', async () => {
    const f = fixture(); await f.session.prepare();
    expect(f.sdk.initTokenClient).not.toHaveBeenCalled();
    f.session.authorize();
    expect(f.sdk.initTokenClient.mock.calls[0]?.[0].scope).toBe(BASIC_SCOPES);
    expect(f.requestAccessToken).toHaveBeenCalledWith({ prompt: 'select_account' });
    f.grant(); await vi.waitFor(() => expect(f.session.getSnapshot().status).toBe('signed-in'));
    expect(f.session.getSnapshot().profile?.sub).toBe('account-a');
    expect(f.session.getSnapshot().youtube).toBe(false);
    expect(JSON.stringify(f.session.getSnapshot())).not.toContain('test-private-token');
    expect(f.fetcher.mock.calls[0]?.[1]).toMatchObject({ headers: { Authorization: 'Bearer test-private-token' }, cache: 'no-store', credentials: 'omit', redirect: 'error' });
  });
  it('requests optional read-only YouTube scope only on a separate user action', async () => {
    const f = fixture(); await f.session.prepare(); f.session.authorize(); f.grant();
    await vi.waitFor(() => expect(f.session.getSnapshot().status).toBe('signed-in'));
    f.session.authorize(true);
    expect(f.sdk.initTokenClient.mock.calls[1]?.[0].scope).toBe(`${BASIC_SCOPES} ${YOUTUBE_SCOPE}`);
    expect(f.requestAccessToken).toHaveBeenLastCalledWith({ prompt: 'consent', hint: 'account-a' });
    f.grant({ scope: BASIC_SCOPES }); await settle();
    expect(f.session.getSnapshot().youtube).toBe(false); // Partial consent is not a library connection.
  });
  it('keeps a valid connection if an extra permission popup is cancelled', async () => {
    const f = fixture(); await f.session.prepare(); f.session.authorize(); f.grant();
    await vi.waitFor(() => expect(f.session.getSnapshot().status).toBe('signed-in'));
    f.session.authorize(true); f.popupError('popup_closed');
    expect(f.session.getSnapshot().profile?.sub).toBe('account-a');
    expect(f.session.getSnapshot().status).toBe('signed-in'); expect(f.session.getSnapshot().youtube).toBe(false);
  });
  it('handles blocked popups without claiming a signed-in account', async () => {
    const f = fixture(); await f.session.prepare(); f.session.authorize(); f.popupError('popup_failed_to_open');
    expect(f.session.getSnapshot().profile).toBeNull(); expect(f.session.getSnapshot().error).toMatch(/Allow popups/);
  });
  it.each([{ error: 'access_denied' }, { access_token: undefined }, { expires_in: -1 }, { expires_in: NaN }])('rejects invalid or denied token replies: %j', async (reply) => {
    const f = fixture(); await f.session.prepare(); f.session.authorize(); f.grant(reply);
    expect(f.session.getSnapshot().profile).toBeNull(); expect(f.fetcher).not.toHaveBeenCalled();
  });
  it('does not restore a session after disconnect while the profile request is pending', async () => {
    const f = fixture(); let resolve!: (response: Response) => void;
    f.fetcher.mockReturnValueOnce(new Promise((r) => { resolve = r; }));
    await f.session.prepare(); f.session.authorize(); f.grant(); f.session.signOut();
    resolve(response({ sub: 'late-account', name: 'Late' })); await settle();
    expect(f.session.getSnapshot().profile).toBeNull(); expect(f.session.getSnapshot().status).toBe('signed-out');
  });
  it('clears identity and library authorization on token expiry', async () => {
    const f = fixture(); await f.session.prepare(); f.session.authorize(); f.grant({ expires_in: 1, scope: `${BASIC_SCOPES} ${YOUTUBE_SCOPE}` });
    await vi.waitFor(() => expect(f.session.getSnapshot().status).toBe('signed-in'));
    vi.advanceTimersByTime(1001);
    expect(f.session.getSnapshot()).toMatchObject({ status: 'expired', profile: null, youtube: false });
    await expect(f.session.youtubeGet('playlists', {})).rejects.toThrow(/Sign in/);
  });
  it('uses a fixed Google API origin, never puts the token in a URL, and expires on 401', async () => {
    const f = fixture(); await f.session.prepare(); f.session.authorize(); f.grant({ scope: `${BASIC_SCOPES} ${YOUTUBE_SCOPE}` });
    await vi.waitFor(() => expect(f.session.getSnapshot().status).toBe('signed-in'));
    f.fetcher.mockResolvedValueOnce(response({ items: [] }));
    await f.session.youtubeGet('playlists', { mine: 'true' });
    expect(f.fetcher.mock.calls[1]?.[0]).toBe('https://www.googleapis.com/youtube/v3/playlists?mine=true');
    expect(f.fetcher.mock.calls[1]?.[1]).toMatchObject({ cache: 'no-store', credentials: 'omit' });
    f.fetcher.mockResolvedValueOnce(response({}, 401));
    await expect(f.session.youtubeGet('playlists', {})).rejects.toThrow(/expired/);
    expect(f.session.getSnapshot().profile).toBeNull();
  });
  it('rejects a library reply from an account that was disconnected mid-request', async () => {
    const f = fixture(); await f.session.prepare(); f.session.authorize(); f.grant({ scope: `${BASIC_SCOPES} ${YOUTUBE_SCOPE}` });
    await vi.waitFor(() => expect(f.session.getSnapshot().status).toBe('signed-in'));
    let resolve!: (response: Response) => void;
    f.fetcher.mockReturnValueOnce(new Promise((r) => { resolve = r; }));
    const pending = f.session.youtubeGet('playlists', {}); f.session.signOut();
    resolve(response({ items: [{ id: 'private-old-user' }] }));
    await expect(pending).rejects.toThrow(/account changed/);
  });
  it('does not expose raw Google errors or response tokens', async () => {
    const f = fixture(); await f.session.prepare(); f.session.authorize();
    f.fetcher.mockResolvedValueOnce(response({ error: 'private-account-data' }, 403));
    f.grant(); await vi.waitFor(() => expect(f.session.getSnapshot().error).toBeTruthy());
    expect(JSON.stringify(f.session.getSnapshot())).not.toMatch(/private-account-data|test-private-token/);
  });
});
