'use client';

import Link from 'next/link';
import Image from 'next/image';
import { Plus } from 'lucide-react';
import { useCart } from '@/components/customer/CartProvider';
import { useSettings } from '@/components/customer/SettingsProvider';
import { formatCurrency } from '@/utils';

export interface ProductCardData {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  price: string;
  discountPrice: string | null;
  imageUrl: string | null;
}

export function ProductCard({ product }: { product: ProductCardData }) {
  const { addItem } = useCart();
  const { currency } = useSettings();
  const hasDiscount = !!product.discountPrice;
  const displayPrice = hasDiscount ? product.discountPrice! : product.price;

  function quickAdd(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    addItem({
      productId: product.id,
      name: product.name,
      slug: product.slug,
      imageUrl: product.imageUrl,
      unitPrice: parseFloat(displayPrice),
      quantity: 1,
      addons: [],
    });
  }

  return (
    <Link
      href={`/product/${product.slug}`}
      className="group flex flex-col rounded-2xl border border-gray-100 bg-white p-2.5 shadow-sm active:scale-[0.98]"
    >
      <div className="relative aspect-square w-full overflow-hidden rounded-xl bg-gray-100">
        {product.imageUrl ? (
          <Image
            src={product.imageUrl}
            alt={product.name}
            fill
            sizes="(max-width: 640px) 45vw, 200px"
            className="object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-3xl">🍽️</div>
        )}
        <button
          type="button"
          onClick={quickAdd}
          aria-label={`Add ${product.name} to cart`}
          className="absolute bottom-1.5 right-1.5 flex h-9 w-9 items-center justify-center rounded-full bg-brand-600 text-white shadow-md active:bg-brand-700"
        >
          <Plus size={18} aria-hidden="true" />
        </button>
      </div>
      <h3 className="mt-2.5 line-clamp-1 text-sm font-medium text-gray-900">{product.name}</h3>
      {product.description && (
        <p className="mt-0.5 line-clamp-1 text-xs text-gray-500">{product.description}</p>
      )}
      <div className="mt-1.5 flex items-baseline gap-1.5">
        <span className="text-sm font-semibold text-gray-900">
          {formatCurrency(displayPrice, currency)}
        </span>
        {hasDiscount && (
          <span className="text-xs text-gray-400 line-through">
            {formatCurrency(product.price, currency)}
          </span>
        )}
      </div>
    </Link>
  );
}
