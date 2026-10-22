import { describe, expect, it } from 'vitest';
import { parsePlaylists } from './library';
describe('YouTube owned-playlist mapping', () => {
  it('maps API metadata and preserves pagination without exposing response extras', () => {
    expect(parsePlaylists({ items: [{ id: 'PL_owned-1', snippet: { title: 'My playlist', description: 'Test', thumbnails: { medium: { url: 'https://i.ytimg.com/cover.jpg' } } }, contentDetails: { itemCount: 12 }, privateExtra: 'not needed' }], nextPageToken: 'page2' })).toEqual({ items: [{ id: 'PL_owned-1', title: 'My playlist', description: 'Test', thumbnail: 'https://i.ytimg.com/cover.jpg', count: 12 }], nextPageToken: 'page2' });
  });
  it('drops malformed ids and unsafe image URLs while tolerating absent metadata', () => {
    expect(parsePlaylists({ items: [{ id: '../bad' }, { id: 'PLok', snippet: { thumbnails: { medium: { url: 'javascript:alert(1)' } } }, contentDetails: { itemCount: -1 } }], nextPageToken: '' })).toEqual({ items: [{ id: 'PLok', title: 'Untitled playlist', description: '', thumbnail: null, count: 0 }], nextPageToken: null });
  });
  it('rejects a non-playlist response', () => {
    expect(() => parsePlaylists({ error: { message: 'do not display raw server data' } })).toThrow('YouTube returned an unreadable playlist list.');
  });
});
