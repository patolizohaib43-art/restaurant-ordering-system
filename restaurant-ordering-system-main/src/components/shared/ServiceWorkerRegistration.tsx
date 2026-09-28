'use client';

import { useEffect } from 'react';

/**
 * Registers the PWA service worker. Deliberately a no-op in development
 * so `next dev` hot reload isn't fought by a stale cached bundle, and a
 * no-op entirely if the browser doesn't support service workers (older
 * WebViews, some in-app browsers).
 */
export function ServiceWorkerRegistration() {
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production') return;
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;

    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js').catch(() => {
        // Registration failures (e.g. unsupported browser, blocked by
        // privacy settings) should never break normal site usage.
      });
    });
  }, []);

  return null;
}
