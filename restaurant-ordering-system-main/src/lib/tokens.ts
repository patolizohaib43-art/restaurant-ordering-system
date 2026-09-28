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
  order: {
    count: () => Promise<number>;
    findUnique: (args: { where: { orderNumber: string }; select: { id: true } }) => Promise<unknown>;
  };
}): Promise<string> {
  // Count-based numbering, but skip any number that already exists so
  // that deleting old orders (e.g. the admin "clear test orders" reset)
  // can never cause a duplicate order number.
  let n = (await tx.order.count()) + 1;
  for (let i = 0; i < 1000; i++, n++) {
    const candidate = `ORD-${1000 + n}`;
    const taken = await tx.order.findUnique({ where: { orderNumber: candidate }, select: { id: true } });
    if (!taken) return candidate;
  }
  throw new Error('Could not allocate an order number.');
}
