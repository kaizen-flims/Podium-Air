package com.music.bitchord.data.playlists

/** YouTube playlist entries, not video IDs: duplicate recordings have distinct entries. */
data class PlaylistMove(val entryId: String, val beforeEntryId: String)

object PlaylistOrder {
    fun moves(original: List<String>, ordered: List<String>): List<PlaylistMove> {
        require(original.all { it.isNotBlank() } && original.distinct().size == original.size) {
            "Reload this playlist before arranging its songs."
        }
        require(original.size == ordered.size && original.toSet() == ordered.toSet()) {
            "The playlist changed. Reopen Arrange songs and try again."
        }
        val working = original.toMutableList()
        return buildList {
            ordered.forEachIndexed { index, entry ->
                if (working[index] != entry) {
                    add(PlaylistMove(entry, working[index]))
                    working.remove(entry)
                    working.add(index, entry)
                }
            }
        }
    }
}
