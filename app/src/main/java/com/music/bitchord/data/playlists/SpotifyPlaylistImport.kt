package com.music.bitchord.data.playlists

import com.music.bitchord.data.Http
import com.music.bitchord.data.YtMusicRepository
import com.music.bitchord.data.model.SearchFilter
import com.music.bitchord.data.model.SearchResult
import com.music.bitchord.data.model.Song
import com.music.bitchord.data.sources.TrackMatcher
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.async
import kotlinx.coroutines.awaitAll
import kotlinx.coroutines.coroutineScope
import kotlinx.coroutines.currentCoroutineContext
import kotlinx.coroutines.ensureActive
import kotlinx.coroutines.sync.Semaphore
import kotlinx.coroutines.sync.withPermit
import kotlinx.coroutines.withContext
import kotlinx.serialization.json.*
import okhttp3.HttpUrl.Companion.toHttpUrlOrNull
import okhttp3.Request
import org.jsoup.Jsoup

data class SpotifyImportTrack(
    val title: String,
    val artist: String,
    val durationSeconds: Int?,
    val explicit: Boolean?,
)

data class SpotifyImportSource(val title: String, val tracks: List<SpotifyImportTrack>, val omitted: Int)
data class SpotifyImportMatch(val source: SpotifyImportTrack, val song: Song?)
data class SpotifyImportPreview(val source: SpotifyImportSource, val matches: List<SpotifyImportMatch>)

/** Public metadata only. No Spotify audio, passwords, app secrets, or session cookies. */
object SpotifyPlaylistImport {
    internal fun playlistId(input: String): String {
        val text = input.trim()
        val uriId = text.takeIf { it.startsWith("spotify:playlist:") }?.removePrefix("spotify:playlist:")
        val id = uriId ?: run {
            val url = text.toHttpUrlOrNull() ?: error("Paste a Spotify playlist link.")
            require(url.isHttps && url.host == "open.spotify.com") { "Use an open.spotify.com playlist link." }
            val path = url.pathSegments.filter { it.isNotBlank() }.dropWhile { it.startsWith("intl-") }
                .let { if (it.firstOrNull() == "embed") it.drop(1) else it }
            require(path.size == 2 && path[0] == "playlist") { "This link is not a Spotify playlist." }
            path[1]
        }
        require(id.matches(Regex("[A-Za-z0-9]{22}"))) { "This Spotify playlist link is invalid." }
        return id
    }

    internal fun parse(html: String): SpotifyImportSource {
        val script = Jsoup.parse(html).getElementById("__NEXT_DATA__")?.data()
            ?: error("Spotify could not show this playlist. Check that it is public and try again.")
        val root = Json.parseToJsonElement(script).jsonObject
        val entity = root["props"]?.jsonObject?.get("pageProps")?.jsonObject
            ?.get("state")?.jsonObject?.get("data")?.jsonObject?.get("entity") as? JsonObject
            ?: error("Spotify could not show this playlist. Check that it is public and try again.")
        require(entity["type"]?.jsonPrimitive?.contentOrNull == "playlist") { "This is not a Spotify playlist." }
        val entries = entity["trackList"] as? JsonArray ?: error("Spotify did not return any playlist tracks.")
        var omitted = 0
        val tracks = entries.mapNotNull { element ->
            val entry = element as? JsonObject ?: run { omitted++; return@mapNotNull null }
            val title = entry["title"]?.jsonPrimitive?.contentOrNull.orEmpty()
            val artist = entry["subtitle"]?.jsonPrimitive?.contentOrNull.orEmpty()
            if (entry["uri"]?.jsonPrimitive?.contentOrNull?.startsWith("spotify:track:") != true ||
                title.isBlank() || artist.isBlank()) {
                omitted++
                return@mapNotNull null
            }
            SpotifyImportTrack(
                title, artist,
                entry["duration"]?.jsonPrimitive?.longOrNull?.takeIf { it > 0 }?.div(1000)?.toInt(),
                entry["isExplicit"]?.jsonPrimitive?.booleanOrNull,
            )
        }
        require(tracks.isNotEmpty()) { "No music tracks were available in Spotify's public preview." }
        return SpotifyImportSource(
            entity["name"]?.jsonPrimitive?.contentOrNull ?: entity["title"]?.jsonPrimitive?.contentOrNull ?: "Spotify playlist",
            tracks, omitted,
        )
    }

    suspend fun preview(link: String, onProgress: (Int, Int) -> Unit): SpotifyImportPreview {
        val id = playlistId(link)
        val source = withContext(Dispatchers.IO) {
            val request = Request.Builder().url("https://open.spotify.com/embed/playlist/$id")
                .header("User-Agent", "Mozilla/5.0").build()
            Http.client.newCall(request).execute().use { response ->
                check(response.isSuccessful) { "Spotify is unavailable (${response.code}). Try again later." }
                parse(response.body?.string() ?: error("Spotify returned an empty response."))
            }
        }
        currentCoroutineContext().ensureActive()
        var completed = 0
        val matches = coroutineScope {
            val limit = Semaphore(3)
            source.tracks.map { track ->
                async {
                    limit.withPermit {
                        val target = TrackMatcher.Target(track.title, track.artist, track.durationSeconds, isExplicit = track.explicit)
                        var match: Song? = null
                        for (query in TrackMatcher.queries(target)) {
                            currentCoroutineContext().ensureActive()
                            val rows = YtMusicRepository.searchTypeahead(query, SearchFilter.SONGS).getOrThrow().rows
                            val songs = rows.mapNotNull { when (it) {
                                is SearchResult.Track -> it.song
                                is SearchResult.TopTrack -> it.song
                                else -> null
                            } }
                            match = TrackMatcher.best(songs, target)
                            if (match != null) break
                        }
                        // All children inherit the caller's Main dispatcher: serial progress updates.
                        onProgress(++completed, source.tracks.size)
                        SpotifyImportMatch(track, match)
                    }
                }
            }.awaitAll()
        }
        return SpotifyImportPreview(source, matches)
    }
}
