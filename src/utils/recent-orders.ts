export const RECENT_ORDERS_KEY = 'restaurant_recent_orders';

export interface RecentOrder {
  token: string;
  orderNumber: string;
  savedAt: number;
}
