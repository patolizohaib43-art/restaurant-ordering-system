import { formatCurrency } from '@/utils';
import type { ReceiptOrderView } from '@/lib/receipt';

interface ReceiptSettings {
  restaurantName: string;
  address: string | null;
  phone: string | null;
  currency: string;
  receiptWidth: 'MM_58' | 'MM_80';
}

const ORDER_TYPE_LABELS: Record<string, string> = {
  DELIVERY: 'DELIVERY',
  PICKUP: 'PICKUP',
  DINE_IN: 'DINE-IN',
};

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  CASH_ON_DELIVERY: 'Cash on Delivery',
  CARD: 'Card',
  ONLINE_WALLET: 'Online Wallet',
};

function formatDateLine(iso: string) {
  const d = new Date(iso);
  const date = d.toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' });
  const time = d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
  return { date, time };
}

/**
 * Renders ONLY the receipt content. No admin chrome, no nav, no buttons —
 * this is the element the `receipt.css` print stylesheet targets. Works
 * for both 58mm and 80mm thermal paper via the `receiptWidth` setting.
 */
export function ThermalReceipt({
  order,
  settings,
}: {
  order: ReceiptOrderView;
  settings: ReceiptSettings;
}) {
  const { date, time } = formatDateLine(order.createdAt);
  const widthClass = settings.receiptWidth === 'MM_58' ? 'receipt-58' : 'receipt-80';
  const currency = settings.currency || 'PKR';

  return (
    <div id="thermal-receipt" className={`receipt-root ${widthClass}`}>
      <div className="receipt-center receipt-bold receipt-name">{settings.restaurantName}</div>
      {settings.phone && <div className="receipt-center">Phone: {settings.phone}</div>}
      {settings.address && <div className="receipt-center">Address: {settings.address}</div>}

      <div className="receipt-divider" />

      <div className="receipt-bold">ORDER #{order.orderNumber}</div>
      <div>Date: {date}</div>
      <div>Time: {time}</div>

      <div className="receipt-divider-dashed" />

      <div>Customer: {order.customerName}</div>
      <div>Phone: {order.customerPhone}</div>
      <div className="receipt-bold">Type: {ORDER_TYPE_LABELS[order.orderType] ?? order.orderType}</div>

      <div className="receipt-divider-dashed" />

      {order.items.map((item) => (
        <div key={item.id} className="receipt-item-block">
          <div className="receipt-row">
            <span>
              {item.quantity} x {item.productName}
            </span>
            <span>{formatCurrency(item.subtotal, currency)}</span>
          </div>
          {item.addons.map((addon, idx) => (
            <div className="receipt-row receipt-addon" key={idx}>
              <span>+ {addon.name}</span>
              <span>{formatCurrency(addon.price, currency)}</span>
            </div>
          ))}
          {item.specialInstructions && (
            <div className="receipt-note">Note: {item.specialInstructions}</div>
          )}
        </div>
      ))}

      <div className="receipt-divider-dashed" />

      <div className="receipt-row">
        <span>Subtotal</span>
        <span>{formatCurrency(order.subtotal, currency)}</span>
      </div>
      {parseFloat(order.discountAmount) > 0 && (
        <div className="receipt-row">
          <span>Discount{order.couponCode ? ` (${order.couponCode})` : ''}{order.dealTitle ? ` (${order.dealTitle})` : ''}</span>
          <span>-{formatCurrency(order.discountAmount, currency)}</span>
        </div>
      )}
      {parseFloat(order.deliveryFee) > 0 && (
        <div className="receipt-row">
          <span>Delivery Fee</span>
          <span>{formatCurrency(order.deliveryFee, currency)}</span>
        </div>
      )}
      {parseFloat(order.taxAmount) > 0 && (
        <div className="receipt-row">
          <span>Tax</span>
          <span>{formatCurrency(order.taxAmount, currency)}</span>
        </div>
      )}

      <div className="receipt-divider" />

      <div className="receipt-row receipt-bold receipt-total">
        <span>TOTAL</span>
        <span>{formatCurrency(order.totalAmount, currency)}</span>
      </div>

      <div className="receipt-divider" />

      <div>Payment: {PAYMENT_METHOD_LABELS[order.paymentMethod] ?? order.paymentMethod}</div>

      {order.orderType === 'DELIVERY' && order.deliveryAddress && (
        <>
          <div className="receipt-divider-dashed" />
          <div className="receipt-bold">Address:</div>
          <div>
            {order.deliveryAddress}
            {order.area ? `, ${order.area}` : ''}
          </div>
        </>
      )}

      {order.deliveryInstructions && (
        <>
          <div className="receipt-divider-dashed" />
          <div className="receipt-bold">Instructions:</div>
          <div>{order.deliveryInstructions}</div>
        </>
      )}

      <div className="receipt-divider" />

      <div className="receipt-center receipt-bold">Thank You!</div>
    </div>
  );
}
