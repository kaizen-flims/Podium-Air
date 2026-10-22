export interface GooglePlaylist { id: string; title: string; description: string; count: number; thumbnail: string | null }
export interface GooglePlaylistPage { items: GooglePlaylist[]; nextPageToken: string | null }
function record(value: unknown): Record<string, unknown> { return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {}; }
function text(value: unknown): string { return typeof value === 'string' ? value : ''; }
export function parsePlaylists(data: unknown): GooglePlaylistPage {
  const root = record(data);
  if (!Array.isArray(root.items)) throw new Error('YouTube returned an unreadable playlist list.');
  const items = root.items.flatMap((item): GooglePlaylist[] => {
    const value = record(item);
    const id = text(value.id);
    if (!/^[A-Za-z0-9_-]{1,100}$/.test(id)) return [];
    const snippet = record(value.snippet);
    const images = record(snippet.thumbnails);
    let thumbnail: string | null = null;
    for (const key of ['medium', 'default', 'high']) {
      try { const url = new URL(text(record(images[key]).url)); if (url.protocol === 'https:') { thumbnail = url.href; break; } } catch { /* No usable thumbnail. */ }
    }
    const count = record(value.contentDetails).itemCount;
    return [{ id, title: text(snippet.title) || 'Untitled playlist', description: text(snippet.description),
      count: typeof count === 'number' && Number.isFinite(count) && count >= 0 ? count : 0, thumbnail }];
  });
  return { items, nextPageToken: typeof root.nextPageToken === 'string' && root.nextPageToken.length > 0 && root.nextPageToken.length <= 2048 ? root.nextPageToken : null };
}
