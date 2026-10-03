package com.music.bitchord

import com.music.bitchord.data.playlists.SpotifyPlaylistImport
import com.music.bitchord.data.sources.TrackMatcher
import com.music.bitchord.data.model.Song
import org.junit.Assert.*
import org.junit.Test

class SpotifyPlaylistImportTest {
    private val id = "3cEYpjA9oz9GiPac4AsH4n"
    private fun page(entries: String) = """
        <html><script id="__NEXT_DATA__" type="application/json">
        {"props":{"pageProps":{"state":{"data":{"entity":{
          "type":"playlist","name":"Prem’s playlist","trackList":[$entries]
        }}}}}}</script></html>
    """.trimIndent()

    @Test fun `accepts shared localized embed and URI playlist links`() {
        listOf("https://open.spotify.com/playlist/$id?si=abc", "https://open.spotify.com/intl-hi/playlist/$id",
            "https://open.spotify.com/embed/playlist/$id", "spotify:playlist:$id").forEach {
            assertEquals(id, SpotifyPlaylistImport.playlistId(it))
        }
    }

    @Test fun `rejects other hosts non-playlists and invalid identifiers`() {
        listOf("https://open.spotify.com.evil.test/playlist/$id", "https://example.com/playlist/$id",
            "http://open.spotify.com/playlist/$id", "https://open.spotify.com/track/$id",
            "spotify:playlist:../../secret", "https://open.spotify.com/playlist/short").forEach {
            assertTrue(it, runCatching { SpotifyPlaylistImport.playlistId(it) }.isFailure)
        }
    }

    @Test fun `preserves Unicode duplicate songs duration and explicit edition`() {
        val entry = """{"uri":"spotify:track:$id","title":"Café","subtitle":"Prem & Friends","duration":185500,"isExplicit":true}"""
        val parsed = SpotifyPlaylistImport.parse(page("$entry,$entry"))
        assertEquals("Prem’s playlist", parsed.title)
        assertEquals(2, parsed.tracks.size)
        assertEquals("Café", parsed.tracks[0].title)
        assertEquals(185, parsed.tracks[0].durationSeconds)
        assertEquals(true, parsed.tracks[0].explicit)
    }

    @Test fun `unsupported podcasts are counted without becoming music tracks`() {
        val parsed = SpotifyPlaylistImport.parse(page("""
          {"uri":"spotify:episode:$id","title":"Podcast","subtitle":"Host"},
          {"uri":"spotify:track:$id","title":"Song","subtitle":"Artist"}
        """))
        assertEquals(1, parsed.omitted)
        assertEquals(1, parsed.tracks.size)
        assertNull(parsed.tracks[0].durationSeconds)
    }

    @Test fun `private unavailable and changed pages produce actionable failures`() {
        listOf("<html>Not available</html>", "<script id='__NEXT_DATA__'>{\"props\":{\"pageProps\":{\"status\":500}}}</script>", page("")).forEach {
            assertTrue(runCatching { SpotifyPlaylistImport.parse(it) }.isFailure)
        }
    }

    @Test fun `matching refuses a cover or remix instead of importing the first search hit`() {
        val target = TrackMatcher.Target("Café", "Prem", durationSec = 185)
        assertNull(TrackMatcher.best(listOf(Song("cover", "Café", "Another singer", null)), target))
        assertNull(TrackMatcher.best(listOf(Song("remix", "Café (Remix)", "Prem", null)), target))
        val correct = Song("correct", "Café", "Prem", null, durationText = "3:05")
        assertEquals(correct, TrackMatcher.best(listOf(Song("cover", "Café", "Another singer", null), correct), target))
    }
}
