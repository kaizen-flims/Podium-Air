import { FcGoogle } from 'react-icons/fc';
import { PrefetchLink } from '@/components/PrefetchLink';
import { googleSession } from './client';
import { useGoogle } from './useGoogle';
const button = 'inline-flex min-h-10 items-center justify-center gap-2 rounded-full border border-[#747775] bg-white px-4 py-2 text-[14px] font-medium text-[#1f1f1f] disabled:cursor-default disabled:opacity-60';
export function GoogleSignInButton({ youtube = false }: { youtube?: boolean }) {
  const auth = useGoogle();
  const busy = auth.status === 'loading' || auth.status === 'authorizing';
  return <button className={button} disabled={busy || auth.status === 'unconfigured'} onClick={() => {
    if (auth.status === 'error') { void googleSession.prepare(); return; }
    googleSession.authorize(youtube);
  }} aria-busy={busy}>
    <FcGoogle size={18} aria-hidden="true" />
    {auth.status === 'loading' ? 'Loading Google…' : auth.status === 'authorizing' ? 'Connecting…' : youtube ? 'Connect YouTube library' : auth.status === 'error' ? 'Retry Google sign-in' : 'Sign in with Google'}
  </button>;
}
/** Independent of the extension account. OAuth does not create a Music cookie session. */
export function GoogleAccountPanel() {
  const auth = useGoogle();
  return <section className="space-y-3 rounded-[12px] bg-quinary p-4">
    <h2 className="type-title-3-emphasized text-primary">Google account</h2>
    {auth.status === 'unconfigured' ? <p className="type-body-tall text-secondary">Google sign-in is being set up for this preview.</p> : <>
      {auth.profile && <div className="flex items-center gap-3">
        {auth.profile.picture && <img src={auth.profile.picture} width={36} height={36} className="size-9 rounded-full" alt="" referrerPolicy="no-referrer" />}
        <div className="min-w-0"><p className="truncate type-body-emphasized">{auth.profile.name}</p><p className="truncate type-body text-secondary">{auth.profile.email}</p></div>
      </div>}
      {auth.error && <p role="status" className="type-body-tall text-secondary">{auth.error}</p>}
      {auth.profile && auth.status !== 'expired' ? <div className="flex flex-wrap items-center gap-3">
        {!auth.youtube && <GoogleSignInButton youtube />}
        {auth.youtube && <PrefetchLink to="/google-library" className="type-body-emphasized text-key">View your YouTube playlists</PrefetchLink>}
        <button className="min-h-10 type-body text-key" onClick={() => googleSession.signOut()}>Disconnect Google</button>
      </div> : <GoogleSignInButton />}
      <p className="type-body-tall text-secondary">You choose whether to grant read-only access to your YouTube playlists. Your connection lasts until this page closes or Google access expires.</p>
    </>}
    <p className="type-body-tall text-secondary">YouTube Music playback still needs the companion extension. Google sign-in does not enable playback on its own.</p>
  </section>;
}
export function GoogleSidebarAccount() {
  const auth = useGoogle();
  return <div className="min-w-0 space-y-2">
    {auth.profile ? <PrefetchLink to="/settings" className="flex min-h-10 items-center gap-2 type-body text-primary">
      {auth.profile.picture ? <img src={auth.profile.picture} className="size-6 rounded-full" width={24} height={24} alt="" referrerPolicy="no-referrer" /> : <FcGoogle size={18} />}
      <span className="truncate">{auth.profile.name}</span>
    </PrefetchLink> : auth.status === 'unconfigured' ? <PrefetchLink className="type-body text-secondary" to="/settings">Google sign-in setup pending</PrefetchLink> : <GoogleSignInButton />}
    {auth.error && <p role="status" className="type-body text-secondary">{auth.error}</p>}
  </div>;
}
