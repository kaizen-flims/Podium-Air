package com.music.bitchord

import com.music.bitchord.data.playlists.PlaylistOrder
import com.music.bitchord.data.innertube.InnertubeParser
import kotlinx.serialization.json.Json
import org.junit.Assert.*
import org.junit.Test
import kotlin.random.Random

class PlaylistOrderTest {
    @Test fun `playlist parser retains repeated recordings by their entry IDs`() {
        fun row(entry: String) = """{"musicResponsiveListItemRenderer":{
          "playlistItemData":{"videoId":"same-recording","playlistSetVideoId":"$entry"},
          "flexColumns":[{"musicResponsiveListItemFlexColumnRenderer":{"text":{"runs":[{"text":"Same song"}]}}}]
        }}"""
        val root = Json.parseToJsonElement("""{"continuationContents":{"musicPlaylistShelfContinuation":{
          "contents":[${row("copy-one")},${row("copy-two")},${row("copy-one")}]
        }}}""")
        val songs = InnertubeParser.parsePlaylistShelf(root)!!.songs
        assertEquals(listOf("copy-one", "copy-two"), songs.map { it.setVideoId })
        assertEquals(listOf("same-recording", "same-recording"), songs.map { it.videoId })
    }

    @Test fun `all positions including last can be reached without dropping an entry`() {
        val original = listOf("first", "second", "third", "fourth", "fifth")
        repeat(100) { seed ->
            val target = original.shuffled(Random(seed))
            val actual = original.toMutableList()
            PlaylistOrder.moves(original, target).forEach { move ->
                assertTrue(actual.remove(move.entryId))
                actual.add(actual.indexOf(move.beforeEntryId), move.entryId)
            }
            assertEquals(target, actual)
        }
    }

    @Test fun `two copies of the same recording remain independent entries`() {
        val original = listOf("song-copy-one", "other-song", "song-copy-two")
        val target = listOf("song-copy-two", "song-copy-one", "other-song")
        assertEquals("song-copy-two", PlaylistOrder.moves(original, target).single().entryId)
    }

    @Test fun `unchanged and empty playlists send no actions`() {
        assertTrue(PlaylistOrder.moves(listOf("one"), listOf("one")).isEmpty())
        assertTrue(PlaylistOrder.moves(emptyList(), emptyList()).isEmpty())
    }

    @Test(expected = IllegalArgumentException::class)
    fun `concurrent additions cannot be overwritten by a stale order`() {
        PlaylistOrder.moves(listOf("one", "two", "new-entry"), listOf("two", "one"))
    }

    @Test(expected = IllegalArgumentException::class)
    fun `missing entry identity is rejected before editing`() {
        PlaylistOrder.moves(listOf("one", ""), listOf("", "one"))
    }

    @Test(expected = IllegalArgumentException::class)
    fun `duplicate entry identity is rejected`() {
        PlaylistOrder.moves(listOf("one", "one"), listOf("one", "one"))
    }
}
