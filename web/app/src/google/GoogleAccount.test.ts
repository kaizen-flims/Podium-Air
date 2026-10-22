/// <reference path="../vite-env.d.ts" />
// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { QueryClientProvider } from '@tanstack/react-query';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { queryClient } from '@/lib/queryClient';
import { GoogleAccountPanel } from './GoogleAccount';
import GoogleLibraryPage from '@/pages/GoogleLibraryPage';
import { googleSession } from './client';
import { BASIC_SCOPES, YOUTUBE_SCOPE, type TokenResponse } from './session';
const mock = vi.hoisted(() => ({ scope: '', callback: null as ((response: TokenResponse) => void) | null, fetcher: vi.fn<typeof fetch>() }));
vi.mock('./client', async () => {
  const { GoogleSession } = await import('./session');
  return { googleSession: new GoogleSession('test-client', async () => ({ initTokenClient: (config) => {
    mock.scope = config.scope; mock.callback = config.callback;
    return { requestAccessToken: () => {} };
  } }), (...args) => mock.fetcher(...args), () => Date.now(), () => window.sessionStorage) };
});
let root: Root;
let host: HTMLDivElement;
const click = async (label: string) => {
  const button = [...host.querySelectorAll('button')].find((element) => element.textContent?.trim() === label);
  expect(button, label).toBeTruthy();
  await act(async () => { button!.click(); });
};
async function grant(scope = BASIC_SCOPES) {
  await act(async () => { mock.callback!({ access_token: 'mock-only-token', expires_in: 3600, scope }); });
}
describe('Google account interface with a mocked provider', () => {
  beforeEach(() => {
    Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
    host = document.createElement('div'); document.body.append(host); root = createRoot(host);
    mock.fetcher.mockReset().mockImplementation(async (url) => new Response(JSON.stringify(String(url).includes('/userinfo')
      ? { sub: 'demo', name: 'Demo Listener', email: 'demo@example.test' }
      : { items: [{ id: 'PL_demo', snippet: { title: 'Private sample playlist' }, contentDetails: { itemCount: 2 } }] }), { status: 200 }));
  });
  afterEach(async () => {
    await act(async () => { root.unmount(); googleSession.signOut(); queryClient.clear(); });
    host.remove();
  });
  async function render(page: 'settings' | 'library' = 'settings') {
    const router = createMemoryRouter([{ path: '/', element: createElement(page === 'settings' ? GoogleAccountPanel : GoogleLibraryPage) }]);
    await act(async () => { root.render(createElement(QueryClientProvider, { client: queryClient }, createElement(RouterProvider, { router }))); });
  }
  it('exposes explicit consent, renders the returned identity, and disconnects cleanly', async () => {
    await render();
    await click('Sign in with Google'); expect(mock.scope).toBe(BASIC_SCOPES);
    await grant(); expect(host.textContent).toContain('Demo Listener');
    expect(host.textContent).toContain('YouTube Music playback still needs the companion extension');
    await click('Connect YouTube library'); expect(mock.scope).toContain(YOUTUBE_SCOPE);
    await grant(`${BASIC_SCOPES} ${YOUTUBE_SCOPE}`);
    expect(host.querySelector('a[href="/google-library"]')?.textContent).toBe('View your YouTube playlists');
    await click('Disconnect Google');
    expect(host.textContent).not.toContain('Demo Listener'); expect(googleSession.getSnapshot().youtube).toBe(false);
    expect(localStorage.length).toBe(0); expect(sessionStorage.length).toBe(0);
  });
  it('only fetches owned playlists after consent and removes them on disconnect', async () => {
    await render('library');
    expect(mock.fetcher).not.toHaveBeenCalled();
    await click('Sign in with Google'); await grant();
    expect(mock.fetcher.mock.calls).toHaveLength(1); // Profile only, no library yet.
    await click('Connect YouTube library'); await grant(`${BASIC_SCOPES} ${YOUTUBE_SCOPE}`);
    await act(async () => { await new Promise((resolve) => setTimeout(resolve, 20)); });
    expect(host.textContent).toContain('Private sample playlist');
    const call = mock.fetcher.mock.calls.find(([url]) => String(url).includes('/playlists?'));
    expect(call).toBeTruthy(); expect(String(call![0])).toContain('mine=true');
    expect(host.querySelector('a[href*="music.youtube.com/playlist"]')?.getAttribute('href')).toBe('https://music.youtube.com/playlist?list=PL_demo');
    await click('Disconnect Google');
    expect(host.textContent).not.toContain('Private sample playlist');
    expect(queryClient.getQueriesData({ queryKey: ['google-library'] }).every(([, data]) => data === undefined)).toBe(true);
  });
  it('offers tab remembering before sign-in and lets the user turn it off', async () => {
    await render();
    const checkbox = host.querySelector<HTMLInputElement>('input[type="checkbox"]')!;
    expect(checkbox.checked).toBe(false);
    await act(async () => { checkbox.click(); });
    await click('Sign in with Google'); await grant();
    expect(sessionStorage.length).toBe(1);
    expect(host.querySelector('a[href="/google-library"]')?.textContent).toBe('Open playlist library');
    await act(async () => { checkbox.click(); });
    expect(sessionStorage.length).toBe(0);
    expect(host.textContent).toContain('Demo Listener');
  });
});
