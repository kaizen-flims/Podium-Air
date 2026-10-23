import { QueryClientProvider } from '@tanstack/react-query';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { createBrowserRouter, createHashRouter, RouterProvider } from 'react-router';
import { queryClient } from '@/lib/queryClient';
import { routes } from '@/routes';
import '@/styles/global.css';

// Remove tokens left by the retired browser OAuth preview without reading values.
try {
  for (let index = window.sessionStorage.length - 1; index >= 0; index--) {
    const key = window.sessionStorage.key(index);
    if (key?.startsWith('podium-air:google-tab:')) window.sessionStorage.removeItem(key);
  }
} catch {
  // Browser storage may be disabled; app startup must still succeed.
}

// Pages has no server-side SPA fallback; fragment routes survive reloads.
const router = import.meta.env.MODE === 'pages' ? createHashRouter(routes) : createBrowserRouter(routes);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  </StrictMode>,
);

// Build-only registration: development stays free of service-worker caching.
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`).catch((error: unknown) => {
      console.warn('Podium Air: offline shell registration failed', error);
    });
  });
}
