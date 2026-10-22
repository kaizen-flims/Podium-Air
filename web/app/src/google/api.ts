import { googleSession } from './client';
import { parsePlaylists, type GooglePlaylistPage } from './library';
export async function loadGooglePlaylists(pageToken: string | null, signal?: AbortSignal): Promise<GooglePlaylistPage> {
  return parsePlaylists(await googleSession.youtubeGet('playlists', { part: 'snippet,contentDetails', mine: 'true', maxResults: '50', ...(pageToken ? { pageToken } : {}) }, signal));
}
