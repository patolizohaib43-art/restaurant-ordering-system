import { NextRequest } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { apiSuccess, apiError } from '@/lib/api-response';

const unsubscribeSchema = z.object({ endpoint: z.string().url().nullable() });

/**
 * Deactivates a push subscription by its endpoint. Called both from the
 * admin Settings screen (explicit "disable notifications on this
 * device") and from the service worker's `pushsubscriptionchange` event
 * (the browser invalidated the endpoint on its own) — neither case
 * requires re-checking the admin session, since knowing the exact
 * endpoint string is itself effectively the capability being revoked,
 * and this can only ever deactivate rows, never read or leak data.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = unsubscribeSchema.safeParse(body);
    if (!parsed.success || !parsed.data.endpoint) {
      return apiSuccess({ unsubscribed: false });
    }

    await db.pushSubscription
      .updateMany({
        where: { endpoint: parsed.data.endpoint },
        data: { isActive: false },
      })
      .catch(() => {});

    return apiSuccess({ unsubscribed: true });
  } catch (error) {
    console.error('POST /api/admin/push/unsubscribe failed:', error);
    return apiError('Could not update push subscription.', 500);
  }
}
