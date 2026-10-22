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

function memoryTab() {
  const data = new Map<string, string>();
  return { data, getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => { data.set(key, value); },
    removeItem: (key: string) => { data.delete(key); } };
}
describe('optional tab restoration', () => {
  beforeEach(() => { vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'Date'] }); });
  afterEach(() => { vi.useRealTimers(); });
  function setup(storage = memoryTab()) {
    let config!: Parameters<GoogleOAuth['initTokenClient']>[0];
    const sdk: GoogleOAuth = { initTokenClient: (input) => { config = input; return { requestAccessToken: vi.fn() }; } };
    const fetcher = vi.fn<typeof fetch>().mockImplementation(async () => response({ sub: 'verified', name: 'Verified account' }));
    const make = () => new GoogleSession('tab-client', async () => sdk, fetcher, () => Date.now(), () => storage);
    const session = make();
    const grant = async () => {
      session.authorize(true);
      config.callback({ access_token: 'short-lived-test-token', expires_in: 3600, scope: `${BASIC_SCOPES} ${YOUTUBE_SCOPE}` });
      await vi.waitFor(() => expect(session.getSnapshot().status).toBe('signed-in'));
    };
    return { session, make, grant, fetcher, storage };
  }
  it('stores nothing by default, then restores an opted-in session after verifying it with Google', async () => {
    const f = setup(); await f.session.prepare(); await f.grant();
    expect(f.storage.data.size).toBe(0);
    f.session.setRememberTab(true);
    expect(f.storage.data.size).toBe(1);
    expect([...f.storage.data.values()][0]).not.toContain('Verified account');
    const fresh = f.make(); expect(fresh.getSnapshot().profile).toBeNull(); await fresh.prepare();
    expect(fresh.getSnapshot()).toMatchObject({ status: 'signed-in', rememberTab: true, youtube: true, profile: { sub: 'verified' } });
    expect(f.fetcher).toHaveBeenCalledTimes(2);
    expect(JSON.stringify(fresh.getSnapshot())).not.toContain('short-lived-test-token');
    fresh.signOut(); expect(f.storage.data.size).toBe(0);
    const signedOut = f.make(); await signedOut.prepare(); expect(signedOut.getSnapshot().profile).toBeNull();
  });
  it('does not extend expiry on refresh and clears stored authorization when it expires', async () => {
    const f = setup(); await f.session.prepare(); f.session.setRememberTab(true); await f.grant();
    vi.advanceTimersByTime(1000); const fresh = f.make(); await fresh.prepare(); vi.advanceTimersByTime(3599001);
    expect(fresh.getSnapshot().status).toBe('expired'); expect(f.storage.data.size).toBe(0);
  });
  it.each(['not json', JSON.stringify({ clientId: 'another-client', accessToken: 'invalid', expiresAt: Date.now() + 1000, youtube: true }),
    JSON.stringify({ clientId: 'tab-client', accessToken: 'invalid', expiresAt: 0, youtube: true })])('discards invalid saved state without an account request', async (raw) => {
    const f = setup(); f.storage.setItem('podium-air:google-tab:tab-client', raw); await f.session.prepare();
    expect(f.fetcher).not.toHaveBeenCalled(); expect(f.storage.data.size).toBe(0); expect(f.session.getSnapshot().profile).toBeNull();
  });
  it('clears a revoked saved token and offers sign-in again', async () => {
    const f = setup(); await f.session.prepare(); f.session.setRememberTab(true); await f.grant();
    f.fetcher.mockResolvedValueOnce(response({}, 401)); const fresh = f.make(); await fresh.prepare();
    expect(fresh.getSnapshot().status).toBe('signed-out'); expect(f.storage.data.size).toBe(0);
    expect(fresh.getSnapshot().error).toMatch(/could not be restored/);
  });
  it('cannot resurrect a session disconnected while restoration is pending', async () => {
    const f = setup(); await f.session.prepare(); f.session.setRememberTab(true); await f.grant();
    let finish!: (value: Response) => void;
    f.fetcher.mockReturnValueOnce(new Promise((resolve) => { finish = resolve; }));
    const fresh = f.make(); const pending = fresh.prepare(); await vi.waitFor(() => expect(f.fetcher).toHaveBeenCalledTimes(2));
    fresh.signOut(); finish(response({ sub: 'late' })); await pending;
    expect(fresh.getSnapshot().profile).toBeNull(); expect(f.storage.data.size).toBe(0);
  });
  it('removes saved authorization when remembering is switched off', async () => {
    const f = setup(); await f.session.prepare(); f.session.setRememberTab(true); await f.grant(); f.session.setRememberTab(false);
    expect(f.storage.data.size).toBe(0); expect(f.session.getSnapshot().status).toBe('signed-in');
  });
  it('keeps memory sign-in usable if browser storage is blocked', async () => {
    const f = setup(); f.storage.setItem = () => { throw new Error('blocked'); };
    await f.session.prepare(); f.session.setRememberTab(true); await f.grant();
    expect(f.session.getSnapshot()).toMatchObject({ status: 'signed-in', rememberTab: false });
    expect(f.session.getSnapshot().error).toMatch(/could not remember/);
  });
});
