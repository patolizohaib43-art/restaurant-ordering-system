/**
 * Consistent restaurant-timezone strategy (Phase 7 production hardening).
 *
 * PROBLEM THIS SOLVES:
 * Reports, the admin dashboard's "Today" figures, and the "is the
 * restaurant open right now" check all need a concept of "today" and
 * "the current time of day". Using the server process's local timezone
 * (via plain `Date.getFullYear()/getHours()` etc.) is unsafe in
 * production: a Linux VPS is often configured for the restaurant's local
 * timezone, but Vercel serverless functions run in UTC by default. That
 * mismatch would silently shift every "Today's Sales" figure and every
 * "open now" check by several hours depending on where the app happens
 * to be deployed — the exact kind of bug that's invisible in a demo and
 * only shows up in production.
 *
 * FIX:
 * All day-boundary and time-of-day logic in this app goes through the
 * helpers below, which compute wall-clock time in a single explicit
 * IANA timezone (RESTAURANT_TIMEZONE), independent of the server's own
 * local timezone or the deployment platform.
 *
 * Configure RESTAURANT_TIMEZONE in your environment (e.g. "Asia/Karachi",
 * "America/New_York"). Defaults to "UTC" if unset — set this explicitly
 * in production so reports and "open now" match the restaurant's actual
 * clock.
 */

export function getRestaurantTimeZone(): string {
  return process.env.RESTAURANT_TIMEZONE?.trim() || 'UTC';
}

interface WallClockParts {
  year: number;
  month: number; // 1-12
  day: number;
  hour: number;
  minute: number;
  second: number;
  weekday: number; // 0 (Sun) - 6 (Sat), matches Date#getDay()
}

const WEEKDAY_INDEX: Record<string, number> = {
  Sun: 0,
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
};

/** Reads the wall-clock date/time for `date` as seen in `timeZone`. */
function getWallClockParts(date: Date, timeZone: string): WallClockParts {
  const dtf = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    weekday: 'short',
  });

  const parts: Record<string, string> = {};
  for (const part of dtf.formatToParts(date)) {
    if (part.type !== 'literal') parts[part.type] = part.value;
  }

  return {
    year: Number(parts.year),
    month: Number(parts.month),
    day: Number(parts.day),
    hour: Number(parts.hour),
    minute: Number(parts.minute),
    second: Number(parts.second),
    weekday: WEEKDAY_INDEX[parts.weekday] ?? 0,
  };
}

/**
 * Returns the UTC instant that corresponds to midnight (00:00:00) on the
 * calendar day that `date` falls on, in `timeZone`. This is the correct
 * "start of today" instant to use in database range queries regardless
 * of what timezone the server process itself is running in.
 */
export function startOfDayInTimeZone(date: Date, timeZone: string): Date {
  const { year, month, day } = getWallClockParts(date, timeZone);

  // Guess midnight as if the wall-clock date were UTC, then correct for
  // the actual UTC offset at that moment (handles DST correctly for all
  // real-world restaurant-hours use cases).
  const guessUtcMs = Date.UTC(year, month - 1, day, 0, 0, 0);
  const offsetMs = getWallClockParts(new Date(guessUtcMs), timeZone);
  const correctionMs = Date.UTC(offsetMs.year, offsetMs.month - 1, offsetMs.day, offsetMs.hour, offsetMs.minute, offsetMs.second) - guessUtcMs;

  return new Date(guessUtcMs - correctionMs);
}

/** Day-of-week (0=Sun..6=Sat) for `date` as seen in `timeZone`. */
export function getWeekdayInTimeZone(date: Date, timeZone: string): number {
  return getWallClockParts(date, timeZone).weekday;
}

/** Minutes since midnight for `date` as seen in `timeZone` (0-1439). */
export function getMinutesSinceMidnightInTimeZone(date: Date, timeZone: string): number {
  const { hour, minute } = getWallClockParts(date, timeZone);
  return hour * 60 + minute;
}

/** Calendar year/month (1-12)/day for `date` as seen in `timeZone`. */
export function getDatePartsInTimeZone(date: Date, timeZone: string): { year: number; month: number; day: number } {
  const { year, month, day } = getWallClockParts(date, timeZone);
  return { year, month, day };
}

/**
 * Returns the UTC instant that corresponds to midnight (00:00:00) on the
 * 1st of the calendar month that `date` falls in, in `timeZone`. Used
 * for "this month" report ranges.
 */
export function startOfMonthInTimeZone(date: Date, timeZone: string): Date {
  const { year, month } = getWallClockParts(date, timeZone);

  const guessUtcMs = Date.UTC(year, month - 1, 1, 0, 0, 0);
  const offsetParts = getWallClockParts(new Date(guessUtcMs), timeZone);
  const correctionMs =
    Date.UTC(offsetParts.year, offsetParts.month - 1, offsetParts.day, offsetParts.hour, offsetParts.minute, offsetParts.second) -
    guessUtcMs;

  return new Date(guessUtcMs - correctionMs);
}
