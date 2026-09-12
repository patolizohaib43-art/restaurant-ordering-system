import webPush from 'web-push';
import { db } from '@/lib/db';

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY;
const VAPID_SUBJECT = process.env.VAPID_SUBJECT || 'mailto:admin@example.com';

let isConfigured = false;
if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
  webPush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
  isConfigured = true;
}

/** True once VAPID keys are present — callers should skip push attempts
 * (and can fall back to in-app/polling only) when this is false, rather
 * than throwing on every order. See .env.example for how to generate
 * these keys. */
export function isPushConfigured(): boolean {
  return isConfigured;
}

export interface PushPayload {
  title: string;
  body: string;
  tag?: string;
  data?: Record<string, unknown>;
}

/**
 * Sends a Web Push notification to every active admin device subscription.
 * This is what actually reaches the Android notification panel even when
 * no admin browser tab is open — the push service (e.g. FCM under the
 * hood for Chrome) wakes the service worker on the device to display it.
 *
 * Never throws: a push failure must never block order creation. Dead
 * subscriptions (expired, unsubscribed, browser data cleared — reported
 * by the push service as HTTP 404/410) are deactivated so we stop
 * wasting requests on them.
 */
export async function sendPushToAllAdmins(payload: PushPayload): Promise<void> {
  if (!isConfigured) return; // no VAPID keys configured — nothing to do

  const subscriptions = await db.pushSubscription.findMany({
    where: { isActive: true },
  });
  if (subscriptions.length === 0) return;

  const body = JSON.stringify(payload);

  await Promise.all(
    subscriptions.map(async (sub) => {
      try {
        await webPush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: { p256dh: sub.p256dh, auth: sub.auth },
          },
          body
        );
        await db.pushSubscription.update({
          where: { id: sub.id },
          data: { lastUsedAt: new Date() },
        });
      } catch (error: unknown) {
        const statusCode = (error as { statusCode?: number })?.statusCode;
        if (statusCode === 404 || statusCode === 410) {
          // Push service confirms this endpoint is gone for good.
          await db.pushSubscription
            .update({ where: { id: sub.id }, data: { isActive: false } })
            .catch(() => {});
        } else {
          console.error('Web Push send failed for subscription', sub.id, error);
        }
      }
    })
  );
}
