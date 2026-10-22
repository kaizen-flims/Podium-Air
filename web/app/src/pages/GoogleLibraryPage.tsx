import { useInfiniteQuery } from '@tanstack/react-query';
import { PageHeader } from '@/components/PageHeader';
import { GoogleAccountPanel } from '@/google/GoogleAccount';
import { loadGooglePlaylists } from '@/google/api';
import { useGoogle } from '@/google/useGoogle';
export default function GoogleLibraryPage() {
  const auth = useGoogle();
  const query = useInfiniteQuery({
    queryKey: ['google-library', auth.revision, auth.profile?.sub, 'owned-playlists'],
    queryFn: ({ pageParam, signal }) => loadGooglePlaylists(pageParam, signal),
    initialPageParam: null as string | null,
    getNextPageParam: (last, _pages, _param, params) => last.nextPageToken && !params.includes(last.nextPageToken) ? last.nextPageToken : undefined,
    enabled: !!auth.profile && auth.youtube && auth.status === 'signed-in',
    gcTime: 0, staleTime: 60000, retry: false,
  });
  const playlists = [...new Map((query.data?.pages.flatMap((page) => page.items) ?? []).map((playlist) => [playlist.id, playlist])).values()];
  return <>
    <PageHeader title="Your YouTube playlists" />
    <div className="mx-auto max-w-[900px] space-y-5 px-(--body-gutter) pb-6">
      <GoogleAccountPanel />
      {auth.profile && auth.youtube && <>
        <p className="type-body-tall text-secondary">Playlists you own on YouTube. Saved playlists and your full YouTube Music library may not appear here. Open a playlist in YouTube Music to listen.</p>
        {query.isPending && <p role="status" className="type-body text-secondary">Loading your playlists…</p>}
        {query.isError && <div role="alert" className="space-y-2 type-body-tall text-secondary">
          <p>{query.error instanceof Error ? query.error.message : 'Your playlists could not load.'}</p>
          <button className="min-h-10 text-key" onClick={() => { void (query.data ? query.fetchNextPage() : query.refetch()); }}>Try again</button>
        </div>}
        {query.isSuccess && !playlists.length && <p className="type-body-tall text-secondary">No owned playlists were returned for this YouTube account.</p>}
        {!!playlists.length && <ul className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,160px),1fr))] gap-5">
          {playlists.map((playlist) => <li key={playlist.id} className="min-w-0 space-y-2">
            <a href={`https://music.youtube.com/playlist?list=${encodeURIComponent(playlist.id)}`} target="_blank" rel="noreferrer" className="block space-y-2">
              <div className="aspect-square overflow-hidden rounded-[8px] bg-quinary">{playlist.thumbnail && <img src={playlist.thumbnail} className="size-full object-cover" alt="" loading="lazy" referrerPolicy="no-referrer" />}</div>
              <p className="truncate type-body-emphasized text-primary">{playlist.title}</p>
              <p className="type-body text-secondary">{playlist.count} items · Open in YouTube Music ↗</p>
            </a>
          </li>)}
        </ul>}
        {query.hasNextPage && <button className="min-h-10 type-body-emphasized text-key disabled:opacity-50" disabled={query.isFetchingNextPage} onClick={() => { void query.fetchNextPage(); }}>{query.isFetchingNextPage ? 'Loading…' : 'Load more playlists'}</button>}
      </>}
    </div>
  </>;
}
