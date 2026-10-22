import { GoogleSession, type GoogleOAuth } from './session';
const SDK_URL = 'https://accounts.google.com/gsi/client';
type GoogleWindow = Window & { google?: { accounts?: { oauth2?: GoogleOAuth } } };
let loading: Promise<GoogleOAuth> | null = null;
export function loadGoogleSdk(): Promise<GoogleOAuth> {
  const existing = (window as GoogleWindow).google?.accounts?.oauth2;
  if (existing) return Promise.resolve(existing);
  if (loading) return loading;
  loading = new Promise<GoogleOAuth>((resolve, reject) => {
    const script = document.createElement('script');
    script.src = SDK_URL;
    script.async = true;
    script.referrerPolicy = 'strict-origin-when-cross-origin';
    const timer = setTimeout(() => fail(), 20000);
    const fail = () => { clearTimeout(timer); script.remove(); loading = null; reject(new Error('Google sign-in could not load')); };
    script.onerror = fail;
    script.onload = () => {
      const sdk = (window as GoogleWindow).google?.accounts?.oauth2;
      if (!sdk) { fail(); return; }
      clearTimeout(timer);
      resolve(sdk);
    };
    document.head.append(script);
  });
  return loading;
}
export const googleSession = new GoogleSession((import.meta.env.VITE_GOOGLE_CLIENT_ID ?? '').trim(), loadGoogleSdk,
  (...args) => fetch(...args), () => Date.now(), () => window.sessionStorage);
