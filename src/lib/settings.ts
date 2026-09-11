import { Prisma } from '@prisma/client';
import { db } from '@/lib/db';
import { getRestaurantTimeZone, getWeekdayInTimeZone, getMinutesSinceMidnightInTimeZone } from '@/lib/timezone';
import { deleteUploadedFileIfManaged } from '@/lib/uploads';

export interface OpeningHoursDay {
  open: string; // "11:00"
  close: string; // "23:00"
  closed?: boolean;
}

export type OpeningHours = Partial<
  Record<'sun' | 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat', OpeningHoursDay>
>;

const DAY_KEYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'] as const;

/**
 * Determines whether the restaurant is currently open based on its
 * configured weekly opening hours. If no hours are configured, the
 * restaurant is treated as always open (falls back to the manual
 * isAcceptingOrders toggle only).
 *
 * Uses RESTAURANT_TIMEZONE (see src/lib/timezone.ts) rather than the
 * server process's local time, so "open now" is correct no matter which
 * timezone the app happens to be deployed/running in.
 */
export function isWithinOpeningHours(
  openingHours: unknown,
  now: Date = new Date(),
  timeZoneOverride?: string | null
): boolean {
  if (!openingHours || typeof openingHours !== 'object') return true;

  const timeZone = getRestaurantTimeZone(timeZoneOverride);
  const hours = openingHours as OpeningHours;
  const dayKey = DAY_KEYS[getWeekdayInTimeZone(now, timeZone)];
  const today = hours[dayKey];

  if (!today || today.closed) return false;

  const [openH, openM] = today.open.split(':').map(Number);
  const [closeH, closeM] = today.close.split(':').map(Number);

  const minutesNow = getMinutesSinceMidnightInTimeZone(now, timeZone);
  const openMinutes = openH * 60 + openM;
  let closeMinutes = closeH * 60 + closeM;

  // Support overnight hours, e.g. open 12:00, close 02:00 (next day)
  if (closeMinutes <= openMinutes) {
    closeMinutes += 24 * 60;
    if (minutesNow < openMinutes) {
      return minutesNow + 24 * 60 < closeMinutes;
    }
  }

  return minutesNow >= openMinutes && minutesNow < closeMinutes;
}

/** Fetches the single-row restaurant settings, creating a sane default if missing. */
export async function getRestaurantSettings() {
  const existing = await db.restaurantSettings.findFirst();
  if (existing) return existing;

  // Safety net: if an admin hasn't configured settings yet, don't crash
  // the storefront — create a sensible default row.
  return db.restaurantSettings.create({
    data: {
      restaurantName: 'Zaiqa-e-Sindh',
      tagline: 'Fast Food BBQ & Pizza',
      logoUrl: '/brand/logo-icon.png',
      currency: 'PKR',
    },
  });
}

/**
 * Settings needed by the admin panel for receipt printing and new-order
 * notifications (Phase 4). Kept separate from `getPublicSettings` because
 * these fields are operational/admin-only and should never leak to the
 * public storefront settings endpoint.
 */
export async function getAdminOperationalSettings() {
  const settings = await getRestaurantSettings();
  return {
    restaurantName: settings.restaurantName,
    tagline: settings.tagline || '',
    logoUrl: settings.logoUrl,
    address: settings.address,
    city: settings.city,
    area: settings.area,
    googleMapsUrl: settings.googleMapsUrl,
    phone: settings.phone,
    whatsapp: settings.whatsapp,
    email: settings.email,
    currency: settings.currency,
    timezone: settings.timezone,
    receiptWidth: settings.receiptWidth,
    autoPrintNewOrders: settings.autoPrintNewOrders,
    notificationSoundEnabled: settings.notificationSoundEnabled,
    deliveryEnabled: settings.deliveryEnabled,
    pickupEnabled: settings.pickupEnabled,
    deliveryFee: settings.deliveryFee.toString(),
    freeDeliveryAboveAmount: settings.freeDeliveryAboveAmount?.toString() ?? null,
    minOrderAmount: settings.minOrderAmount.toString(),
    taxPercentage: settings.taxPercentage.toString(),
    isAcceptingOrders: settings.isAcceptingOrders,
    openingHours: settings.openingHours as OpeningHours | null,
  };
}

export interface UpdatePrintSettingsInput {
  receiptWidth?: 'MM_58' | 'MM_80';
  autoPrintNewOrders?: boolean;
  notificationSoundEnabled?: boolean;
  // Brand profile fields — kept in the same update path as print settings
  // so the admin Settings screen can save everything from one form.
  restaurantName?: string;
  tagline?: string;
  logoUrl?: string;
  // ---------------- Phase 10: business / delivery / address ----------------
  phone?: string;
  whatsapp?: string;
  email?: string;
  address?: string;
  city?: string;
  area?: string;
  googleMapsUrl?: string;
  timezone?: string;
  currency?: string;
  deliveryEnabled?: boolean;
  pickupEnabled?: boolean;
  deliveryFee?: number;
  freeDeliveryAboveAmount?: number | null;
  minOrderAmount?: number;
  taxPercentage?: number;
  isAcceptingOrders?: boolean;
  openingHours?: OpeningHours;
}

/** Updates the Phase 4 print/notification fields plus basic brand profile fields. */
export async function updatePrintSettings(input: UpdatePrintSettingsInput) {
  const current = await getRestaurantSettings();

  if (input.logoUrl !== undefined && current.logoUrl !== input.logoUrl) {
    await deleteUploadedFileIfManaged(current.logoUrl);
  }

  const updated = await db.restaurantSettings.update({
    where: { id: current.id },
    data: {
      ...(input.restaurantName !== undefined && { restaurantName: input.restaurantName }),
      ...(input.tagline !== undefined && { tagline: input.tagline }),
      ...(input.logoUrl !== undefined && { logoUrl: input.logoUrl }),
      ...(input.receiptWidth !== undefined && { receiptWidth: input.receiptWidth }),
      ...(input.autoPrintNewOrders !== undefined && { autoPrintNewOrders: input.autoPrintNewOrders }),
      ...(input.notificationSoundEnabled !== undefined && {
        notificationSoundEnabled: input.notificationSoundEnabled,
      }),
      ...(input.phone !== undefined && { phone: input.phone }),
      ...(input.whatsapp !== undefined && { whatsapp: input.whatsapp }),
      ...(input.email !== undefined && { email: input.email }),
      ...(input.address !== undefined && { address: input.address }),
      ...(input.city !== undefined && { city: input.city }),
      ...(input.area !== undefined && { area: input.area }),
      ...(input.googleMapsUrl !== undefined && { googleMapsUrl: input.googleMapsUrl }),
      ...(input.timezone !== undefined && { timezone: input.timezone }),
      ...(input.currency !== undefined && { currency: input.currency }),
      ...(input.deliveryEnabled !== undefined && { deliveryEnabled: input.deliveryEnabled }),
      ...(input.pickupEnabled !== undefined && { pickupEnabled: input.pickupEnabled }),
      ...(input.deliveryFee !== undefined && { deliveryFee: input.deliveryFee }),
      ...(input.freeDeliveryAboveAmount !== undefined && {
        freeDeliveryAboveAmount: input.freeDeliveryAboveAmount,
      }),
      ...(input.minOrderAmount !== undefined && { minOrderAmount: input.minOrderAmount }),
      ...(input.taxPercentage !== undefined && { taxPercentage: input.taxPercentage }),
      ...(input.isAcceptingOrders !== undefined && { isAcceptingOrders: input.isAcceptingOrders }),
      ...(input.openingHours !== undefined && {
        openingHours: input.openingHours as unknown as Prisma.InputJsonValue,
      }),
    },
  });
  return updated;
}

export async function getPublicSettings() {
  const settings = await getRestaurantSettings();
  const isOpenNow =
    settings.isAcceptingOrders &&
    isWithinOpeningHours(settings.openingHours, new Date(), settings.timezone);

  return {
    restaurantName: settings.restaurantName,
    tagline: settings.tagline || '',
    logoUrl: settings.logoUrl,
    address: settings.address,
    city: settings.city,
    area: settings.area,
    googleMapsUrl: settings.googleMapsUrl,
    phone: settings.phone,
    whatsapp: settings.whatsapp,
    openingHours: settings.openingHours,
    deliveryEnabled: settings.deliveryEnabled,
    pickupEnabled: settings.pickupEnabled,
    deliveryFee: settings.deliveryFee.toString(),
    freeDeliveryAboveAmount: settings.freeDeliveryAboveAmount?.toString() ?? null,
    minOrderAmount: settings.minOrderAmount.toString(),
    taxPercentage: settings.taxPercentage.toString(),
    currency: settings.currency,
    timezone: getRestaurantTimeZone(settings.timezone),
    isAcceptingOrders: settings.isAcceptingOrders,
    isOpenNow,
  };
}
