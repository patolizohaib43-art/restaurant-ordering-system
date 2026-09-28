import { NextRequest } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { apiSuccess, apiError } from '@/lib/api-response';
import { getAdminSession } from '@/lib/auth';

const subscribeSchema = z.object({
  endpoint: z.string().url(),
  keys: z.object({
    p256dh: z.string().min(1),
    auth: z.string().min(1),
  }),
});

/**
 * Saves a browser's PushSubscription against the currently logged-in
 * admin, so the server can later send this specific device a
 * notification even while no tab is open (see src/lib/push.ts).
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getAdminSession();
    if (!session) return apiError('Unauthorized.', 401);

    const body = await request.json();
    const parsed = subscribeSchema.safeParse(body);
    if (!parsed.success) {
      return apiError('Invalid push subscription payload.');
    }

    const userAgent = request.headers.get('user-agent') ?? undefined;

    // upsert on the unique `endpoint`: re-subscribing the same device
    // (e.g. after reinstalling the PWA) just reactivates/updates its row
    // rather than creating duplicates, and correctly re-associates it if
    // a different admin account logs in on that device later.
    await db.pushSubscription.upsert({
      where: { endpoint: parsed.data.endpoint },
      update: {
        adminId: session.adminId,
        p256dh: parsed.data.keys.p256dh,
        auth: parsed.data.keys.auth,
        userAgent,
        isActive: true,
      },
      create: {
        adminId: session.adminId,
        endpoint: parsed.data.endpoint,
        p256dh: parsed.data.keys.p256dh,
        auth: parsed.data.keys.auth,
        userAgent,
      },
    });

    return apiSuccess({ subscribed: true });
  } catch (error) {
    console.error('POST /api/admin/push/subscribe failed:', error);
    return apiError('Could not save push subscription.', 500);
  }
}
