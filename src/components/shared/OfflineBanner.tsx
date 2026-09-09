'use client';

import { useEffect, useState } from 'react';
import { WifiOff } from 'lucide-react';

/**
 * Phase 6: honest offline messaging. This app is NOT designed to place
 * orders offline — the service worker only caches safe static assets, so
 * we surface a clear banner instead of letting the UI silently fail or
 * falsely imply offline ordering works.
 */
export function OfflineBanner() {
  const [isOffline, setIsOffline] = useState(false);

  useEffect(() => {
    setIsOffline(!navigator.onLine);

    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (!isOffline) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed inset-x-0 top-0 z-50 flex items-center justify-center gap-2 bg-gray-900 px-4 py-2 text-center text-xs font-medium text-white"
    >
      <WifiOff size={14} aria-hidden="true" />
      You are offline. Please reconnect to place an order.
    </div>
  );
}
