import Image from 'next/image';
import { formatCurrency } from '@/utils';

export interface DealCardData {
  id: string;
  title: string;
  description: string | null;
  imageUrl: string | null;
  discountType: 'PERCENTAGE' | 'FIXED';
  discountValue: string;
  minOrderAmount: string | null;
}

export function DealCard({
  deal,
  currency,
  className = 'w-64 shrink-0',
}: {
  deal: DealCardData;
  currency: string;
  className?: string;
}) {
  const discountLabel =
    deal.discountType === 'PERCENTAGE'
      ? `${parseFloat(deal.discountValue)}% OFF`
      : `${formatCurrency(deal.discountValue, currency)} OFF`;

  return (
    <div className={`overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm ${className}`}>
      <div className="relative h-28 w-full bg-gradient-to-br from-secondary-500 via-brand-600 to-brand-800">
        {deal.imageUrl && (
          <Image
            src={deal.imageUrl}
            alt={deal.title}
            fill
            sizes="256px"
            className="object-cover"
          />
        )}
        <span className="absolute left-2 top-2 rounded-full bg-accent-500 px-2.5 py-1 text-xs font-bold text-charcoal-900 shadow">
          {discountLabel}
        </span>
      </div>
      <div className="p-3">
        <h3 className="line-clamp-1 text-sm font-semibold text-gray-900">{deal.title}</h3>
        {deal.description && (
          <p className="mt-0.5 line-clamp-2 text-xs text-gray-500">{deal.description}</p>
        )}
        {deal.minOrderAmount && (
          <p className="mt-1 text-[11px] text-gray-400">
            Min. order {formatCurrency(deal.minOrderAmount, currency)}
          </p>
        )}
      </div>
    </div>
  );
}
