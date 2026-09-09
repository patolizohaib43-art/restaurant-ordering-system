import { formatCurrency } from '@/utils';

interface PriceSummaryProps {
  subtotal: number;
  discountAmount?: number;
  deliveryFee?: number;
  taxAmount?: number;
  total: number;
  currency: string;
}

export function PriceSummary({
  subtotal,
  discountAmount = 0,
  deliveryFee = 0,
  taxAmount = 0,
  total,
  currency,
}: PriceSummaryProps) {
  return (
    <div className="space-y-2 text-sm">
      <Row label="Subtotal" value={formatCurrency(subtotal, currency)} />
      {discountAmount > 0 && (
        <Row
          label="Discount"
          value={`-${formatCurrency(discountAmount, currency)}`}
          valueClass="text-green-600"
        />
      )}
      <Row label="Delivery fee" value={formatCurrency(deliveryFee, currency)} />
      {taxAmount > 0 && <Row label="Tax" value={formatCurrency(taxAmount, currency)} />}
      <div className="my-1 border-t border-dashed border-gray-200" />
      <Row
        label="Grand total"
        value={formatCurrency(total, currency)}
        labelClass="text-base font-semibold text-gray-900"
        valueClass="text-base font-bold text-gray-900"
      />
    </div>
  );
}

function Row({
  label,
  value,
  labelClass = 'text-gray-500',
  valueClass = 'font-medium text-gray-900',
}: {
  label: string;
  value: string;
  labelClass?: string;
  valueClass?: string;
}) {
  return (
    <div className="flex items-center justify-between">
      <span className={labelClass}>{label}</span>
      <span className={valueClass}>{value}</span>
    </div>
  );
}
