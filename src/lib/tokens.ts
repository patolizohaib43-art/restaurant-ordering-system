import crypto from 'crypto';

/**
 * Generates a cryptographically secure, URL-safe random token.
 * Used for order tracking tokens so customers can only ever access
 * their own order — tokens are never sequential or guessable.
 */
export function generateSecureToken(bytes = 24): string {
  return crypto.randomBytes(bytes).toString('base64url');
}

/**
 * Generates a short, human-friendly sequential order number (e.g. "ORD-1025")
 * for receipts/staff use. This is NOT used for customer order lookup —
 * only the high-entropy trackingToken is used for that, so sequential
 * numbering here carries no security risk.
 *
 * Pass the transaction client when calling inside db.$transaction so the
 * count and the insert are consistent.
 */
export async function generateOrderNumber(tx: {
  order: { count: () => Promise<number> };
}): Promise<string> {
  const existingCount = await tx.order.count();
  return `ORD-${1000 + existingCount + 1}`;
}
