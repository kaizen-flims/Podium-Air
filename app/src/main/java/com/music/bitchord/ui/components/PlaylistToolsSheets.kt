package com.music.bitchord.ui.components

import androidx.compose.foundation.gestures.detectDragGestures
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.itemsIndexed
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.Add
import androidx.compose.material.icons.rounded.Check
import androidx.compose.material.icons.rounded.DragHandle
import androidx.compose.material.icons.rounded.KeyboardArrowDown
import androidx.compose.material.icons.rounded.KeyboardArrowUp
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import com.music.bitchord.R
import coil3.compose.AsyncImage
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.ui.draw.clip
import com.music.bitchord.data.model.ROW_ART_PX
import com.music.bitchord.data.model.artworkAt
import com.music.bitchord.data.YtMusicRepository
import com.music.bitchord.data.model.SearchFilter
import com.music.bitchord.data.model.SearchResult
import com.music.bitchord.data.model.Song
import com.music.bitchord.data.model.UserPlaylist
import com.music.bitchord.data.playlists.SpotifyImportPreview
import com.music.bitchord.data.playlists.SpotifyPlaylistImport
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch

@Composable
private fun PlaylistToolHeading(title: String, subtitle: String) {
    Text(title, style = MaterialTheme.typography.headlineSmall)
    Text(subtitle, style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
}

@Composable
fun AddPlaylistSongsSheet(
    playlist: UserPlaylist,
    onAdd: suspend (Song) -> Result<Boolean>,
    onBusyChange: (Boolean) -> Unit,
) {
    val scope = rememberCoroutineScope()
    var query by remember { mutableStateOf("") }
    var songs by remember { mutableStateOf<List<Song>>(emptyList()) }
    var loading by remember { mutableStateOf(false) }
    var adding by remember { mutableStateOf<String?>(null) }
    var added by remember { mutableStateOf<Set<String>>(emptySet()) }
    var error by remember { mutableStateOf<String?>(null) }
    var retry by remember { mutableIntStateOf(0) }
    LaunchedEffect(query, retry) {
        songs = emptyList()
        error = null
        loading = false
        val input = query.trim()
        if (input.length < 2) return@LaunchedEffect
        loading = true
        delay(300)
        YtMusicRepository.searchTypeahead(input, SearchFilter.SONGS).fold(
            onSuccess = { page ->
                songs = page.rows.mapNotNull { row -> when (row) {
                    is SearchResult.Track -> row.song
                    is SearchResult.TopTrack -> row.song
                    else -> null
                } }.distinctBy { it.videoId }
            },
            onFailure = { error = it.message },
        )
        loading = false
    }
    Column(Modifier.fillMaxWidth().fillMaxHeight(0.85f).imePadding().padding(horizontal = PAGE_GUTTER)) {
        PlaylistToolHeading(stringResource(R.string.playlist_add_songs), playlist.title)
        OutlinedTextField(
            value = query, onValueChange = { query = it }, singleLine = true,
            label = { Text(stringResource(R.string.playlist_search_songs)) },
            modifier = Modifier.fillMaxWidth().padding(vertical = 12.dp),
        )
        if (loading) LinearProgressIndicator(Modifier.fillMaxWidth())
        error?.let { message ->
            Text(message, color = MaterialTheme.colorScheme.error)
            TextButton(onClick = { retry++ }) { Text(stringResource(R.string.retry)) }
        }
        if (!loading && error == null && songs.isEmpty()) {
            Text(stringResource(if (query.trim().length < 2) R.string.playlist_type_to_search else R.string.playlist_no_results))
        }
        LazyColumn(Modifier.weight(1f)) {
            itemsIndexed(songs, key = { _, song -> song.videoId }) { _, song ->
                Row(verticalAlignment = Alignment.CenterVertically) {
                    AsyncImage(
                        model = song.artworkAt(ROW_ART_PX), contentDescription = null,
                        modifier = Modifier.padding(vertical = 6.dp).size(48.dp).clip(RoundedCornerShape(8.dp)),
                    )
                    Column(Modifier.weight(1f).padding(horizontal = 12.dp)) {
                        Text(song.title, maxLines = 1, overflow = TextOverflow.Ellipsis)
                        Text(song.artist, maxLines = 1, overflow = TextOverflow.Ellipsis,
                            style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    }
                    IconButton(enabled = adding == null && song.videoId !in added, onClick = {
                        adding = song.videoId
                        onBusyChange(true)
                        scope.launch {
                            try {
                                onAdd(song).fold(
                                    onSuccess = { added = added + song.videoId; error = null },
                                    onFailure = { error = it.message ?: "Could not add this song." },
                                )
                            } finally {
                                adding = null
                                onBusyChange(false)
                            }
                        }
                    }) {
                        when {
                            adding == song.videoId -> CircularProgressIndicator(Modifier.size(22.dp), strokeWidth = 2.dp)
                            song.videoId in added -> Icon(Icons.Rounded.Check, stringResource(R.string.song_added_to_playlist))
                            else -> Icon(Icons.Rounded.Add, stringResource(R.string.playlist_add_songs))
                        }
                    }
                }
            }
        }
    }
}

@Composable
fun ArrangePlaylistSongsSheet(
    playlist: UserPlaylist,
    onSave: suspend (List<Song>, List<Song>) -> Result<Unit>,
    onSaved: () -> Unit,
    onBusyChange: (Boolean) -> Unit,
) {
    val scope = rememberCoroutineScope()
    val listState = rememberLazyListState()
    var original by remember { mutableStateOf<List<Song>>(emptyList()) }
    var ordered by remember { mutableStateOf<List<Song>>(emptyList()) }
    var loading by remember { mutableStateOf(true) }
    var saving by remember { mutableStateOf(false) }
    var error by remember { mutableStateOf<String?>(null) }
    var retry by remember { mutableIntStateOf(0) }
    LaunchedEffect(playlist.playlistId, retry) {
        loading = true
        error = null
        YtMusicRepository.playlistEntries(playlist.browseId).fold(
            onSuccess = { original = it; ordered = it },
            onFailure = { error = it.message ?: "Could not load this playlist." },
        )
        loading = false
    }
    val currentRows by rememberUpdatedState(ordered)
    val rowHeight = with(LocalDensity.current) { 76.dp.toPx() }
    val canArrange = ordered.all { !it.setVideoId.isNullOrBlank() } &&
        ordered.map { it.setVideoId }.distinct().size == ordered.size
    val move: (Int, Int) -> Unit = { from, to ->
        if (!saving && from in ordered.indices && to in ordered.indices && from != to) {
            ordered = ordered.toMutableList().apply { add(to, removeAt(from)) }
        }
    }
    Column(Modifier.fillMaxWidth().fillMaxHeight(0.85f).padding(horizontal = PAGE_GUTTER)) {
        PlaylistToolHeading(stringResource(R.string.playlist_arrange_songs), playlist.title)
        Text(stringResource(R.string.playlist_arrange_hint), modifier = Modifier.padding(vertical = 10.dp))
        if (loading || saving) LinearProgressIndicator(Modifier.fillMaxWidth())
        error?.let {
            Text(it, color = MaterialTheme.colorScheme.error)
            TextButton(enabled = !saving, onClick = { retry++ }) { Text(stringResource(R.string.retry)) }
        }
        if (!loading && !canArrange) Text(stringResource(R.string.playlist_reload_entries))
        LazyColumn(state = listState, modifier = Modifier.weight(1f)) {
            itemsIndexed(ordered, key = { index, song -> song.setVideoId ?: "missing:$index" }) { index, song ->
                val entry = song.setVideoId
                Row(Modifier.fillMaxWidth().height(76.dp), verticalAlignment = Alignment.CenterVertically) {
                    Text("${index + 1}", modifier = Modifier.width(30.dp), color = MaterialTheme.colorScheme.onSurfaceVariant)
                    Column(Modifier.weight(1f)) {
                        Text(song.title, maxLines = 1, overflow = TextOverflow.Ellipsis)
                        Text(song.artist, maxLines = 1, overflow = TextOverflow.Ellipsis,
                            style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    }
                    IconButton(enabled = canArrange && !saving && index > 0, onClick = { move(index, index - 1) }) {
                        Icon(Icons.Rounded.KeyboardArrowUp, stringResource(R.string.playlist_move_up))
                    }
                    IconButton(enabled = canArrange && !saving && index < ordered.lastIndex, onClick = { move(index, index + 1) }) {
                        Icon(Icons.Rounded.KeyboardArrowDown, stringResource(R.string.playlist_move_down))
                    }
                    val currentMove by rememberUpdatedState(move)
                    val locked by rememberUpdatedState(saving || !canArrange)
                    Icon(
                        Icons.Rounded.DragHandle, stringResource(R.string.drag_to_reorder),
                        modifier = Modifier.size(40.dp).pointerInput(entry) {
                            var offset = 0f
                            detectDragGestures(
                                onDragStart = { offset = 0f },
                                onDragEnd = { offset = 0f },
                                onDragCancel = { offset = 0f },
                            ) { change, delta ->
                                if (!locked) {
                                    change.consume()
                                    offset += delta.y
                                    val from = currentRows.indexOfFirst { it.setVideoId == entry }
                                    val direction = when { offset > rowHeight / 2 -> 1; offset < -rowHeight / 2 -> -1; else -> 0 }
                                    val to = from + direction
                                    if (direction != 0 && from >= 0 && to in currentRows.indices) {
                                        currentMove(from, to)
                                        offset -= direction * rowHeight
                                        // Keep the moved row visible when crossing a viewport edge.
                                        if (to < listState.firstVisibleItemIndex || to > (listState.layoutInfo.visibleItemsInfo.lastOrNull()?.index ?: to)) {
                                            scope.launch { listState.scrollToItem(to) }
                                        }
                                    }
                                }
                            }
                        },
                    )
                }
            }
        }
        Button(
            enabled = !loading && !saving && canArrange && original != ordered,
            modifier = Modifier.fillMaxWidth().padding(vertical = 12.dp),
            onClick = {
                saving = true
                onBusyChange(true)
                scope.launch {
                    try {
                        onSave(original, ordered).fold(onSuccess = { onSaved() }, onFailure = { error = it.message })
                    } finally { saving = false; onBusyChange(false) }
                }
            },
        ) { Text(stringResource(R.string.playlist_save_order)) }
    }
}

@Composable
fun SpotifyImportSheet(
    onImport: suspend (String, List<Song>) -> Result<String>,
    onImported: () -> Unit,
    onBusyChange: (Boolean) -> Unit,
) {
    val scope = rememberCoroutineScope()
    var link by remember { mutableStateOf("") }
    var title by remember { mutableStateOf("") }
    var preview by remember { mutableStateOf<SpotifyImportPreview?>(null) }
    var selected by remember { mutableStateOf<Set<Int>>(emptySet()) }
    var working by remember { mutableStateOf(false) }
    var saving by remember { mutableStateOf(false) }
    var progress by remember { mutableStateOf<Pair<Int, Int>?>(null) }
    var error by remember { mutableStateOf<String?>(null) }
    // A failed write can have created a partial playlist; require a new preview before another create.
    var attempted by remember { mutableStateOf(false) }
    Column(Modifier.fillMaxWidth().fillMaxHeight(0.88f).imePadding().padding(horizontal = PAGE_GUTTER)) {
        PlaylistToolHeading(stringResource(R.string.playlist_import_spotify), stringResource(R.string.playlist_import_description))
        Text(stringResource(R.string.playlist_import_public_preview), style = MaterialTheme.typography.bodySmall,
            color = MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.padding(vertical = 10.dp))
        if (preview == null) {
            OutlinedTextField(link, { link = it }, enabled = !working, singleLine = true,
                label = { Text(stringResource(R.string.playlist_spotify_link)) }, modifier = Modifier.fillMaxWidth())
            Button(enabled = link.isNotBlank() && !working, modifier = Modifier.padding(vertical = 10.dp), onClick = {
                working = true; error = null; attempted = false
                scope.launch {
                    try {
                        val result = SpotifyPlaylistImport.preview(link) { done, total -> progress = done to total }
                        preview = result
                        title = result.source.title
                        selected = result.matches.indices.filter { result.matches[it].song != null }.toSet()
                    } catch (failure: Exception) {
                        if (failure is CancellationException) throw failure
                        error = failure.message ?: "Could not read this Spotify playlist."
                    } finally { working = false }
                }
            }) { Text(stringResource(R.string.playlist_preview_import)) }
        } else {
            val loaded = preview!!
            OutlinedTextField(title, { title = it }, singleLine = true, enabled = !saving,
                label = { Text(stringResource(R.string.playlist_import_name)) }, modifier = Modifier.fillMaxWidth())
            Text(stringResource(R.string.playlist_import_matched, selected.size, loaded.matches.size), modifier = Modifier.padding(vertical = 8.dp))
            if (loaded.source.omitted > 0) Text(stringResource(R.string.playlist_import_omitted, loaded.source.omitted))
            LazyColumn(Modifier.weight(1f)) {
                itemsIndexed(loaded.matches, key = { index, _ -> index }) { index, match ->
                    Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.fillMaxWidth().padding(vertical = 4.dp)) {
                        Checkbox(index in selected, enabled = match.song != null && !saving,
                            onCheckedChange = { checked -> selected = if (checked) selected + index else selected - index })
                        Column(Modifier.weight(1f)) {
                            Text(match.source.title, maxLines = 1, overflow = TextOverflow.Ellipsis)
                            Text(match.source.artist, style = MaterialTheme.typography.bodySmall)
                            Text(match.song?.let { "${it.title} · ${it.artist}" } ?: stringResource(R.string.playlist_import_unmatched),
                                style = MaterialTheme.typography.bodySmall,
                                color = if (match.song == null) MaterialTheme.colorScheme.error else MaterialTheme.colorScheme.onSurfaceVariant)
                        }
                    }
                }
            }
            Button(enabled = !saving && !attempted && selected.isNotEmpty() && title.isNotBlank(),
                modifier = Modifier.fillMaxWidth().padding(vertical = 10.dp), onClick = {
                    saving = true; attempted = true; onBusyChange(true)
                    val songs = loaded.matches.mapIndexedNotNull { index, match -> match.song.takeIf { index in selected } }
                    scope.launch {
                        try {
                            onImport(title, songs).fold(onSuccess = { onImported() }, onFailure = { error = it.message })
                        } finally { saving = false; onBusyChange(false) }
                    }
                }) { Text(stringResource(R.string.playlist_import_confirm, selected.size)) }
        }
        if (working || saving) {
            LinearProgressIndicator(Modifier.fillMaxWidth())
            progress?.takeIf { working }?.let { (done, total) -> Text(stringResource(R.string.playlist_import_progress, done, total)) }
        }
        error?.let { Text(it, color = MaterialTheme.colorScheme.error, modifier = Modifier.padding(vertical = 10.dp)) }
        Spacer(Modifier.height(12.dp))
    }
}
