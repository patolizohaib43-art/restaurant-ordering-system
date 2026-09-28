import { NextRequest } from 'next/server';
import { apiSuccess, apiError } from '@/lib/api-response';
import { getAdminOperationalSettings, updatePrintSettings } from '@/lib/settings';
import { printSettingsSchema } from '@/validation/schemas';

// Auth for everything under /api/admin/* is already enforced by
// src/middleware.ts, which blocks unauthenticated requests before they
// reach this handler.

export async function GET() {
  try {
    const settings = await getAdminOperationalSettings();
    return apiSuccess(settings);
  } catch (error) {
    console.error('GET /api/admin/settings failed:', error);
    return apiError('Could not load settings.', 500);
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = printSettingsSchema.safeParse(body);
    if (!parsed.success) {
      return apiError(parsed.error.errors[0]?.message ?? 'Invalid settings.');
    }

    await updatePrintSettings(parsed.data);
    const settings = await getAdminOperationalSettings();
    return apiSuccess(settings);
  } catch (error) {
    console.error('PATCH /api/admin/settings failed:', error);
    return apiError('Could not update settings.', 500);
  }
}
