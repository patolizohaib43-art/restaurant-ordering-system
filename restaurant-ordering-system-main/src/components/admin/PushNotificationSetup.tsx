'use client';

import { useEffect, useState } from 'react';
import { Bell, Check, Loader2 } from 'lucide-react';

type PushState =
  | 'unsupported'
  | 'checking'
  | 'not-subscribed'
  | 'subscribing'
  | 'subscribed'
  | 'denied'
  | 'error';

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i++) outputArray[i] = rawData.charCodeAt(i);
  return outputArray;
}

/**
 * Real Web Push subscription — distinct from the plain browser
 * Notification permission used elsewhere in Settings. This is what
 * actually enables notifications while the admin panel/browser is fully
 * closed: it registers the service worker, asks for permission (only on
 * a direct tap, never automatically), creates a PushSubscription via the
 * browser's push service, and sends it to the server to store against
 * this admin (see /api/admin/push/subscribe and src/lib/push.ts).
 */
export function PushNotificationSetup() {
  const [state, setState] = useState<PushState>('checking');
  const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

  useEffect(() => {
    (async () => {
      if (
        typeof window === 'undefined' ||
        !('serviceWorker' in navigator) ||
        !('PushManager' in window) ||
        !vapidPublicKey
      ) {
        setState('unsupported');
        return;
      }
      if (Notification.permission === 'denied') {
        setState('denied');
        return;
      }
      try {
        const registration = await navigator.serviceWorker.ready;
        const existing = await registration.pushManager.getSubscription();
        setState(existing ? 'subscribed' : 'not-subscribed');
      } catch {
        setState('error');
      }
    })();
  }, [vapidPublicKey]);

  async function subscribe() {
    if (!vapidPublicKey) return;
    setState('subscribing');
    try {
      const registration = await navigator.serviceWorker.ready;

      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        setState(permission === 'denied' ? 'denied' : 'not-subscribed');
        return;
      }

      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidPublicKey) as unknown as BufferSource,
      });

      const res = await fetch('/api/admin/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(subscription.toJSON()),
      });
      const json = await res.json();
      if (!json.success) throw new Error();

      setState('subscribed');
    } catch {
      setState('error');
    }
  }

  if (state === 'checking') {
    return (
      <div className="flex items-center justify-between rounded-xl bg-gray-50 px-3.5 py-3">
        <p className="text-sm font-medium text-gray-900">Push Notifications (this device)</p>
        <Loader2 size={16} className="animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between rounded-xl bg-gray-50 px-3.5 py-3">
      <div>
        <p className="text-sm font-medium text-gray-900">Push Notifications (this device)</p>
        <p className="text-xs text-gray-500">
          {state === 'unsupported' && 'Not supported on this browser/device.'}
          {state === 'denied' && "Blocked — re-enable from your browser's site settings."}
          {state === 'not-subscribed' && 'Get an Android/browser alert for new orders, even with the app closed.'}
          {state === 'subscribed' && 'Enabled — you\u2019ll be notified on this device even when this tab is closed.'}
          {state === 'error' && 'Something went wrong setting this up. Try again.'}
        </p>
      </div>
      {(state === 'not-subscribed' || state === 'error') && (
        <button
          type="button"
          onClick={subscribe}
          className="h-9 shrink-0 rounded-xl bg-brand-600 px-3.5 text-xs font-semibold text-white"
        >
          Enable
        </button>
      )}
      {state === 'subscribing' && <Loader2 size={18} className="shrink-0 animate-spin text-gray-400" />}
      {state === 'subscribed' && <Check size={18} className="shrink-0 text-green-600" />}
    </div>
  );
}
