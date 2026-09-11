/**
 * Formats a date/time using an explicit IANA timezone rather than the
 * browser/device's local one. Used anywhere customer- or admin-facing UI
 * shows an order timestamp (tracking timeline, receipt, order
 * confirmation) — per the Phase 10 requirement that displayed times
 * always reflect the restaurant's configured timezone (Settings →
 * Business → Timezone), not wherever the customer/admin happens to be.
 *
 * Safe to call from both client and server components: `Intl` with a
 * `timeZone` option needs no Node-only APIs.
 */
export function formatDateInTimeZone(iso: string | Date, timeZone: string): string {
  const d = typeof iso === 'string' ? new Date(iso) : iso;
  return new Intl.DateTimeFormat(undefined, {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    timeZone,
  }).format(d);
}

export function formatTimeInTimeZone(iso: string | Date, timeZone: string): string {
  const d = typeof iso === 'string' ? new Date(iso) : iso;
  return new Intl.DateTimeFormat(undefined, {
    hour: '2-digit',
    minute: '2-digit',
    timeZone,
  }).format(d);
}

export function formatDateTimeInTimeZone(iso: string | Date, timeZone: string): string {
  const d = typeof iso === 'string' ? new Date(iso) : iso;
  return new Intl.DateTimeFormat(undefined, {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    timeZone,
  }).format(d);
}
