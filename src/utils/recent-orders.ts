export const RECENT_ORDERS_KEY = 'restaurant_recent_orders';
export const CUSTOMER_PHONE_KEY = 'restaurant_customer_phone';

export interface RecentOrder {
  token: string;
  orderNumber: string;
  savedAt: number;
}

/**
 * Remembers a just-placed order (tracking token + number) and the
 * customer's phone on this device, so Track Order can find it again
 * after a refresh/close without asking for anything. localStorage is a
 * convenience only — if unavailable, phone lookup still works.
 */
export function rememberPlacedOrder(order: { token: string; orderNumber: string; phone?: string }) {
  try {
    const raw = window.localStorage.getItem(RECENT_ORDERS_KEY);
    const existing: RecentOrder[] = raw ? JSON.parse(raw) : [];
    const updated = [
      { token: order.token, orderNumber: order.orderNumber, savedAt: Date.now() },
      ...existing.filter((o) => o.token !== order.token),
    ].slice(0, 10);
    window.localStorage.setItem(RECENT_ORDERS_KEY, JSON.stringify(updated));
    if (order.phone) window.localStorage.setItem(CUSTOMER_PHONE_KEY, order.phone);
  } catch {
    // ignore (private mode / quota)
  }
}
