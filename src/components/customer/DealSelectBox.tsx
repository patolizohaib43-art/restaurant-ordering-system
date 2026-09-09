'use client';

import { useEffect, useState } from 'react';
import { Sparkles, X } from 'lucide-react';
import { cn, formatCurrency } from '@/utils';

interface DealOption {
  id: string;
  title: string;
  discountType: 'PERCENTAGE' | 'FIXED';
  discountValue: string;
  minOrderAmount: string | null;
}

export interface AppliedDeal {
  id: string;
  title: string;
  discountAmount: number;
}

interface DealSelectBoxProps {
  subtotal: number;
  currency: string;
  applied: AppliedDeal | null;
  onApplied: (deal: AppliedDeal | null) => void;
}

/**
 * Lets the customer pick one active promotional deal to redeem on their
 * order. The final discount is always recomputed server-side in
 * `priceOrder` — this component only estimates it for display, and only
 * ever sends the selected `dealId` to the server.
 */
export function DealSelectBox({ subtotal, currency, applied, onApplied }: DealSelectBoxProps) {
  const [deals, setDeals] = useState<DealOption[] | null>(null);

  useEffect(() => {
    fetch('/api/deals')
      .then((res) => res.json())
      .then((json) => {
        if (json.success) setDeals(json.data);
      })
      .catch(() => setDeals([]));
  }, []);

  if (!deals || deals.length === 0) return null;

  function estimateDiscount(deal: DealOption): number {
    const min = deal.minOrderAmount ? parseFloat(deal.minOrderAmount) : 0;
    if (subtotal < min) return 0;
    const value = parseFloat(deal.discountValue);
    const raw = deal.discountType === 'PERCENTAGE' ? (subtotal * value) / 100 : value;
    return Math.min(raw, subtotal);
  }

  function select(deal: DealOption) {
    if (applied?.id === deal.id) {
      onApplied(null);
      return;
    }
    onApplied({ id: deal.id, title: deal.title, discountAmount: estimateDiscount(deal) });
  }

  return (
    <div>
      <h2 className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-gray-900">
        <Sparkles size={15} className="text-brand-600" /> Available deals
      </h2>
      <div className="flex gap-2 overflow-x-auto pb-1">
        {deals.map((deal) => {
          const min = deal.minOrderAmount ? parseFloat(deal.minOrderAmount) : 0;
          const eligible = subtotal >= min;
          const isSelected = applied?.id === deal.id;
          return (
            <button
              key={deal.id}
              type="button"
              disabled={!eligible}
              onClick={() => select(deal)}
              className={cn(
                'flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-xl border-2 px-3.5 py-2.5 text-left text-xs font-medium',
                isSelected
                  ? 'border-brand-600 bg-brand-50 text-brand-700'
                  : eligible
                  ? 'border-gray-200 text-gray-700'
                  : 'border-gray-100 text-gray-300'
              )}
            >
              <span>{deal.title}</span>
              {isSelected && <X size={13} />}
              {!eligible && (
                <span className="text-[10px]">min {formatCurrency(min, currency)}</span>
              )}
            </button>
          );
        })}
      </div>
      {applied && (
        <p className="mt-1.5 text-xs text-green-700">
          &ldquo;{applied.title}&rdquo; applied — you saved{' '}
          {formatCurrency(applied.discountAmount, currency)}
        </p>
      )}
    </div>
  );
}
