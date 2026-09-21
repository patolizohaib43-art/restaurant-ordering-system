'use client';

import Image from 'next/image';
import { Plus, Check } from 'lucide-react';
import { useState } from 'react';
import { formatCurrency } from '@/utils';
import { useCart } from '@/components/customer/CartProvider';

export interface DealCardData {
  id: string;
  title: string;
  description: string | null;
  imageUrl: string | null;
  discountType: 'PERCENTAGE' | 'FIXED';
  discountValue: string;
  minOrderAmount: string | null;
  /** Phase 12: present when this deal is an orderable bundle. */
  bundlePrice?: string | null;
  dealItems?: { productName: string; quantity: number }[];
  bundleAvailable?: boolean;
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
  const { addItem } = useCart();
  const [justAdded, setJustAdded] = useState(false);
  const isBundle = !!deal.bundlePrice && (deal.dealItems?.length ?? 0) > 0;

  const discountLabel =
    deal.discountType === 'PERCENTAGE'
      ? `${parseFloat(deal.discountValue)}% OFF`
      : `${formatCurrency(deal.discountValue, currency)} OFF`;

  function handleAddToCart() {
    if (!deal.bundlePrice) return;
    addItem({
      dealId: deal.id,
      name: deal.title,
      slug: deal.id,
      imageUrl: deal.imageUrl,
      unitPrice: parseFloat(deal.bundlePrice),
      quantity: 1,
      addons: [],
    });
    setJustAdded(true);
    setTimeout(() => setJustAdded(false), 1500);
  }

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
          {isBundle ? formatCurrency(deal.bundlePrice as string, currency) : discountLabel}
        </span>
      </div>
      <div className="p-3">
        <h3 className="line-clamp-1 text-sm font-semibold text-gray-900">{deal.title}</h3>
        {isBundle ? (
          <p className="mt-0.5 line-clamp-2 text-xs text-gray-500">
            {deal.dealItems!.map((di) => `${di.quantity}× ${di.productName}`).join(' + ')}
          </p>
        ) : (
          deal.description && (
            <p className="mt-0.5 line-clamp-2 text-xs text-gray-500">{deal.description}</p>
          )
        )}
        {deal.minOrderAmount && !isBundle && (
          <p className="mt-1 text-[11px] text-gray-400">
            Min. order {formatCurrency(deal.minOrderAmount, currency)}
          </p>
        )}
        {isBundle && (
          <button
            type="button"
            onClick={handleAddToCart}
            disabled={deal.bundleAvailable === false}
            className="mt-2 flex h-9 w-full items-center justify-center gap-1.5 rounded-xl bg-brand-600 text-xs font-bold text-white disabled:bg-gray-300"
          >
            {deal.bundleAvailable === false ? (
              'Currently unavailable'
            ) : justAdded ? (
              <>
                <Check size={14} /> Added
              </>
            ) : (
              <>
                <Plus size={14} /> Add to cart
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
}
