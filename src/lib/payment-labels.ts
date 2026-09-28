export function paymentMethodLabel(
  method: string,
  provider?: string | null,
  orderType?: string | null
): string {
  if (method === 'ONLINE_WALLET') {
    if (provider === 'EASYPAISA') return 'Online Payment (Easypaisa)';
    if (provider === 'JAZZCASH') return 'Online Payment (JazzCash)';
    return 'Online Payment';
  }
  if (method === 'CARD') return 'Card';
  return orderType === 'PICKUP' ? 'Cash on Pickup' : 'Cash on Delivery';
}

export function paymentStatusLabel(method: string, status: string): string {
  switch (status) {
    case 'PAID':
      return 'Paid';
    case 'FAILED':
      return 'Payment failed';
    case 'REFUNDED':
      return 'Refunded';
    default:
      return method === 'ONLINE_WALLET' ? 'Awaiting verification' : 'Unpaid (pay on delivery)';
  }
}

export const PAYMENT_STATUS_STYLES: Record<string, string> = {
  PAID: 'bg-green-100 text-green-800',
  PENDING: 'bg-amber-100 text-amber-800',
  FAILED: 'bg-red-100 text-red-800',
  REFUNDED: 'bg-orange-100 text-orange-800',
};
