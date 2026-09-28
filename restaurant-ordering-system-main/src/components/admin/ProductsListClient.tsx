'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { Plus, Search, Loader2, UtensilsCrossed, FolderCog } from 'lucide-react';
import { EmptyState } from '@/components/shared/EmptyState';
import { ErrorState } from '@/components/shared/ErrorState';
import { formatCurrency } from '@/utils';

interface ProductRow {
  id: string;
  name: string;
  price: string;
  discountPrice: string | null;
  imageUrl: string | null;
  isAvailable: boolean;
  isFeatured: boolean;
  isPopular: boolean;
  category: { id: string; name: string } | null;
  addonCount: number;
}

export function ProductsListClient() {
  const [products, setProducts] = useState<ProductRow[] | null>(null);
  const [error, setError] = useState(false);
  const [search, setSearch] = useState('');

  const load = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      const res = await fetch(`/api/admin/products?${params.toString()}`, { cache: 'no-store' });
      const json = await res.json();
      if (!json.success) throw new Error();
      setProducts(json.data);
      setError(false);
    } catch {
      setError(true);
    }
  }, [search]);

  useEffect(() => {
    const t = setTimeout(load, 250);
    return () => clearTimeout(t);
  }, [load]);

  async function toggleAvailable(product: ProductRow) {
    await fetch(`/api/admin/products/${product.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isAvailable: !product.isAvailable }),
    });
    load();
  }

  return (
    <div>
      <div className="sticky top-14 z-20 space-y-3 border-b border-gray-100 bg-gray-50 px-4 py-3">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search products..."
              className="h-11 w-full rounded-xl border border-gray-200 bg-white pl-10 pr-3 text-sm focus:border-brand-500 focus:outline-none"
            />
          </div>
          <Link
            href="/admin/categories"
            aria-label="Manage categories"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-600"
          >
            <FolderCog size={18} />
          </Link>
        </div>
        <Link
          href="/admin/products/new"
          className="flex h-11 w-full items-center justify-center gap-2 rounded-2xl bg-brand-600 text-sm font-bold text-white"
        >
          <Plus size={18} /> Add Product
        </Link>
      </div>

      <div className="px-4 py-4">
        {error && !products && <ErrorState message="Could not load products." onRetry={load} />}
        {!error && !products && (
          <div className="flex h-64 items-center justify-center">
            <Loader2 className="animate-spin text-gray-300" size={28} />
          </div>
        )}
        {products && products.length === 0 && (
          <EmptyState
            icon={<UtensilsCrossed size={40} />}
            title="No products found"
            message="Try a different search, or add your first product."
          />
        )}
        {products && products.length > 0 && (
          <div className="space-y-2.5">
            {products.map((product) => (
              <div
                key={product.id}
                className="flex gap-3 rounded-2xl border border-gray-100 bg-white p-3"
              >
                <Link href={`/admin/products/${product.id}`} className="h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-gray-100">
                  {product.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={product.imageUrl} alt={product.name} className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-lg">🍽️</div>
                  )}
                </Link>
                <div className="min-w-0 flex-1">
                  <Link href={`/admin/products/${product.id}`}>
                    <p className="truncate text-sm font-semibold text-gray-900">{product.name}</p>
                    <p className="text-xs text-gray-400">
                      {product.category?.name ?? 'Uncategorized'} · {product.addonCount} add-ons
                    </p>
                    <div className="mt-1 flex items-baseline gap-1.5">
                      <span className="text-sm font-bold text-gray-900">
                        {formatCurrency(product.discountPrice ?? product.price, 'PKR')}
                      </span>
                      {product.discountPrice && (
                        <span className="text-xs text-gray-400 line-through">
                          {formatCurrency(product.price, 'PKR')}
                        </span>
                      )}
                    </div>
                  </Link>
                  <div className="mt-1.5 flex flex-wrap gap-1">
                    {product.isFeatured && <Tag label="Featured" color="bg-blue-50 text-blue-700" />}
                    {product.isPopular && <Tag label="Popular" color="bg-purple-50 text-purple-700" />}
                  </div>
                </div>
                <label className="flex shrink-0 flex-col items-center gap-1 text-[10px] text-gray-500">
                  <input
                    type="checkbox"
                    checked={product.isAvailable}
                    onChange={() => toggleAvailable(product)}
                    className="h-5 w-5"
                  />
                  {product.isAvailable ? 'In Stock' : 'Out'}
                </label>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function Tag({ label, color }: { label: string; color: string }) {
  return (
    <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${color}`}>{label}</span>
  );
}
