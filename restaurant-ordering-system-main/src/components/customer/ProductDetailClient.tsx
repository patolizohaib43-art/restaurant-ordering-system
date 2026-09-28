'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { Clock, Check } from 'lucide-react';
import { useCart } from '@/components/customer/CartProvider';
import { useSettings } from '@/components/customer/SettingsProvider';
import { QuantityStepper } from '@/components/customer/QuantityStepper';
import { formatCurrency } from '@/utils';

export interface ProductAddonData {
  id: string;
  name: string;
  price: string;
  maxQuantity: number;
}

export interface ProductDetailData {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  price: string;
  discountPrice: string | null;
  imageUrl: string | null;
  preparationTime: number | null;
  addons: ProductAddonData[];
}

export function ProductDetailClient({ product }: { product: ProductDetailData }) {
  const router = useRouter();
  const { addItem } = useCart();
  const { currency } = useSettings();

  const [selectedAddonIds, setSelectedAddonIds] = useState<string[]>([]);
  const [quantity, setQuantity] = useState(1);
  const [instructions, setInstructions] = useState('');
  const [justAdded, setJustAdded] = useState(false);

  const unitPrice = parseFloat(product.discountPrice ?? product.price);

  const addonsTotal = useMemo(
    () =>
      selectedAddonIds.reduce((sum, id) => {
        const addon = product.addons.find((a) => a.id === id);
        return sum + (addon ? parseFloat(addon.price) : 0);
      }, 0),
    [selectedAddonIds, product.addons]
  );

  const lineTotal = (unitPrice + addonsTotal) * quantity;

  function toggleAddon(id: string) {
    setSelectedAddonIds((prev) =>
      prev.includes(id) ? prev.filter((a) => a !== id) : [...prev, id]
    );
  }

  function handleAddToCart() {
    const addons = selectedAddonIds.map((id) => {
      const addon = product.addons.find((a) => a.id === id)!;
      return { addonId: addon.id, name: addon.name, price: parseFloat(addon.price) };
    });

    addItem({
      productId: product.id,
      name: product.name,
      slug: product.slug,
      imageUrl: product.imageUrl,
      unitPrice,
      quantity,
      addons,
      specialInstructions: instructions.trim() || undefined,
    });

    setJustAdded(true);
    setTimeout(() => setJustAdded(false), 1800);
  }

  return (
    <div className="pb-28">
      <div className="relative aspect-[4/3] w-full bg-gray-100">
        {product.imageUrl ? (
          <Image
            src={product.imageUrl}
            alt={product.name}
            fill
            priority
            sizes="100vw"
            className="object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-6xl">🍽️</div>
        )}
      </div>

      <div className="px-4 py-4">
        <h1 className="text-xl font-bold text-gray-900">{product.name}</h1>

        <div className="mt-2 flex items-center gap-3">
          <span className="text-lg font-bold text-gray-900">
            {formatCurrency(unitPrice, currency)}
          </span>
          {product.discountPrice && (
            <span className="text-sm text-gray-400 line-through">
              {formatCurrency(product.price, currency)}
            </span>
          )}
          {product.preparationTime && (
            <span className="ml-auto flex items-center gap-1 text-xs text-gray-500">
              <Clock size={14} /> {product.preparationTime} min
            </span>
          )}
        </div>

        {product.description && (
          <p className="mt-3 text-sm leading-relaxed text-gray-600">{product.description}</p>
        )}

        {product.addons.length > 0 && (
          <div className="mt-6">
            <h2 className="mb-3 text-sm font-semibold text-gray-900">Add-ons</h2>
            <div className="space-y-2.5">
              {product.addons.map((addon) => {
                const checked = selectedAddonIds.includes(addon.id);
                return (
                  <label
                    key={addon.id}
                    className="flex min-h-11 cursor-pointer items-center justify-between rounded-xl border border-gray-200 px-3.5 py-2.5"
                  >
                    <span className="flex items-center gap-3">
                      <span
                        className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border ${
                          checked ? 'border-brand-600 bg-brand-600 text-white' : 'border-gray-300'
                        }`}
                      >
                        {checked && <Check size={13} />}
                      </span>
                      <span className="text-sm text-gray-800">{addon.name}</span>
                    </span>
                    <span className="flex items-center gap-3">
                      <span className="text-sm font-medium text-gray-600">
                        +{formatCurrency(addon.price, currency)}
                      </span>
                      <input
                        type="checkbox"
                        className="sr-only"
                        checked={checked}
                        onChange={() => toggleAddon(addon.id)}
                      />
                    </span>
                  </label>
                );
              })}
            </div>
          </div>
        )}

        <div className="mt-6">
          <h2 className="mb-2 text-sm font-semibold text-gray-900">Special instructions</h2>
          <textarea
            value={instructions}
            onChange={(e) => setInstructions(e.target.value)}
            maxLength={300}
            rows={3}
            placeholder="e.g. less spicy, no onions..."
            className="w-full rounded-xl border border-gray-200 p-3 text-sm focus:border-brand-500 focus:outline-none"
          />
        </div>

        <div className="mt-6 flex items-center justify-between">
          <span className="text-sm font-semibold text-gray-900">Quantity</span>
          <QuantityStepper quantity={quantity} onChange={setQuantity} />
        </div>
      </div>

      {/* Sticky Add to Cart bar */}
      <div className="fixed bottom-[64px] left-0 right-0 z-20 border-t border-gray-100 bg-white px-4 py-3 shadow-[0_-4px_12px_rgba(0,0,0,0.04)]">
        <div className="mx-auto flex max-w-lg items-center gap-3">
          <button
            type="button"
            onClick={handleAddToCart}
            className="flex h-12 flex-1 items-center justify-center gap-2 rounded-2xl bg-brand-600 text-sm font-bold text-white active:bg-brand-700"
          >
            {justAdded ? (
              <>
                <Check size={18} /> Added to cart
              </>
            ) : (
              `Add to Cart · ${formatCurrency(lineTotal, currency)}`
            )}
          </button>
          {justAdded && (
            <button
              type="button"
              onClick={() => router.push('/cart')}
              className="flex h-12 shrink-0 items-center justify-center rounded-2xl border border-gray-300 px-4 text-sm font-semibold text-gray-700"
            >
              View Cart
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
