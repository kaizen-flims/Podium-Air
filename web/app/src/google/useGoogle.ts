import { useEffect, useSyncExternalStore } from 'react';
import { queryClient } from '@/lib/queryClient';
import { googleSession } from './client';
let lastRevision = googleSession.getSnapshot().revision;
googleSession.subscribe(() => {
  const revision = googleSession.getSnapshot().revision;
  if (revision === lastRevision) return;
  lastRevision = revision;
  // Private library data must disappear on sign-out, account change and expiry.
  void queryClient.cancelQueries({ queryKey: ['google-library'] });
  queryClient.removeQueries({ queryKey: ['google-library'] });
});
export function useGoogle() {
  const state = useSyncExternalStore(googleSession.subscribe, googleSession.getSnapshot);
  useEffect(() => { void googleSession.prepare(); }, []);
  return state;
}
