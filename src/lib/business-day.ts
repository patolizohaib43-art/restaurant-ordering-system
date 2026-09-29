import {
  getRestaurantTimeZone,
  getDatePartsInTimeZone,
  getMinutesSinceMidnightInTimeZone,
  getWeekdayInTimeZone,
} from '@/lib/timezone';

/**
 * BUSINESS DAY ("Today Sale" session) logic.
 *
 * A restaurant open 6:00 PM → 2:00 AM has ONE sales session per evening:
 * 27 Sep 6:00 PM → 28 Sep 2:00 AM is the SAME session. A session runs
 * from one opening time until the NEXT day's opening time (so a stray
 * order placed between closing and re-opening is attached to the
 * session that just ended instead of being lost). All calculations
 * happen in the restaurant's timezone, never the server's.
 *
 * Hours are read per WEEKDAY from Settings → Business (the same
 * "openingHours" JSON used by the Open/Closed indicator on the site),
 * exactly matching src/lib/settings.ts#isWithinOpeningHours. A session
 * always uses the hours of the day it OPENED on — Monday's session uses
 * Monday's configured hours even after midnight rolls into Tuesday. If
 * a weekday has no hours configured (or is marked closed), the default
 * 6:00 PM – 2:00 AM is used for that day only, so sales are never lost
 * just because one day wasn't set up.
 */

export const DEFAULT_OPEN_TIME = '18:00';
export const DEFAULT_CLOSE_TIME = '02:00';

const DAY_KEYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'] as const;

export interface BusinessHours {
  openTime: string; // "HH:MM" 24h
  closeTime: string; // "HH:MM" 24h
}

export interface BusinessSession {
  /** Inclusive start (UTC instant of opening time). */
  start: Date;
  /** Exclusive end = the next day's opening time. */
  end: Date;
  /** Actual closing time of this session (e.g. 2:00 AM next day). */
  closeAt: Date;
  /** True while `now` is inside [start, closeAt). */
  isOpenNow: boolean;
  openTime: string;
  closeTime: string;
}

function parseHHMM(v: string | undefined, fallback: string): number {
  const m = /^(\d{1,2}):(\d{2})/.exec(v ?? '') ?? /^(\d{1,2}):(\d{2})/.exec(fallback)!;
  const h = Math.min(Math.max(Number(m[1]), 0), 23);
  const min = Math.min(Math.max(Number(m[2]), 0), 59);
  return h * 60 + min;
}

/** This weekday's configured hours, falling back to 6 PM – 2 AM if unset/closed. */
function hoursForWeekday(openingHours: unknown, weekday: number): BusinessHours {
  if (openingHours && typeof openingHours === 'object') {
    const day = (openingHours as Record<string, any>)[DAY_KEYS[((weekday % 7) + 7) % 7]];
    if (day && !day.closed && typeof day.open === 'string' && typeof day.close === 'string') {
      return { openTime: day.open, closeTime: day.close };
    }
  }
  return { openTime: DEFAULT_OPEN_TIME, closeTime: DEFAULT_CLOSE_TIME };
}

/** UTC instant for wall-clock `minutes` past midnight on y-m-d in `timeZone` (DST-safe). */
function zonedTimeToUtc(y: number, m: number, d: number, minutes: number, timeZone: string): Date {
  const wallAsUtc = Date.UTC(y, m - 1, d, 0, minutes, 0);
  let result = wallAsUtc;
  // Two passes so DST-transition days converge on the right offset.
  for (let i = 0; i < 2; i++) {
    const probe = new Date(result);
    const p = getDatePartsInTimeZone(probe, timeZone);
    const shownAsUtc =
      Date.UTC(p.year, p.month - 1, p.day, 0, 0, 0) +
      getMinutesSinceMidnightInTimeZone(probe, timeZone) * 60000;
    result -= shownAsUtc - wallAsUtc;
  }
  return new Date(result);
}

function addDays(y: number, m: number, d: number, n: number) {
  const t = new Date(Date.UTC(y, m - 1, d + n));
  return { y: t.getUTCFullYear(), m: t.getUTCMonth() + 1, d: t.getUTCDate() };
}

/**
 * The business session containing `now`. `sessionsBack` = 1 gives the
 * previous session ("yesterday"), 2 the one before, and so on.
 */
export function getBusinessSession(
  now: Date,
  timeZoneOverride: string | null | undefined,
  openingHours: unknown,
  sessionsBack = 0
): BusinessSession {
  const timeZone = getRestaurantTimeZone(timeZoneOverride);
  const today = getDatePartsInTimeZone(now, timeZone);
  const todayWeekday = getWeekdayInTimeZone(now, timeZone);
  const todayOpenMin = parseHHMM(hoursForWeekday(openingHours, todayWeekday).openTime, DEFAULT_OPEN_TIME);
  const nowMin = getMinutesSinceMidnightInTimeZone(now, timeZone);

  // How many days back from today is the session that contains `now`?
  // Before today's opening time, we're still inside yesterday's session.
  const daysBack = (nowMin >= todayOpenMin ? 0 : 1) + sessionsBack;
  const baseWeekday = todayWeekday - daysBack;
  const base = addDays(today.year, today.month, today.day, -daysBack);

  const hours = hoursForWeekday(openingHours, baseWeekday);
  const openMin = parseHHMM(hours.openTime, DEFAULT_OPEN_TIME);
  const closeMin = parseHHMM(hours.closeTime, DEFAULT_CLOSE_TIME);

  const next = addDays(base.y, base.m, base.d, 1);
  const nextHours = hoursForWeekday(openingHours, baseWeekday + 1);
  const nextOpenMin = parseHHMM(nextHours.openTime, DEFAULT_OPEN_TIME);

  const start = zonedTimeToUtc(base.y, base.m, base.d, openMin, timeZone);
  const end = zonedTimeToUtc(next.y, next.m, next.d, nextOpenMin, timeZone);
  // Overnight (close <= open): closes the next calendar day.
  const closeDay = closeMin <= openMin ? next : base;
  const closeAt = zonedTimeToUtc(closeDay.y, closeDay.m, closeDay.d, closeMin, timeZone);

  return {
    start,
    end,
    closeAt,
    isOpenNow: now >= start && now < closeAt,
    openTime: hours.openTime,
    closeTime: hours.closeTime,
  };
}
