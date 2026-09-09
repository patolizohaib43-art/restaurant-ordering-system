'use client';

import { useEffect, useRef, useState } from 'react';
import { Search, X, Loader2 } from 'lucide-react';
import { ProductCard, type ProductCardData } from '@/components/customer/ProductCard';
import { ProductGridSkeleton } from '@/components/shared/Skeletons';
import { EmptyState } from '@/components/shared/EmptyState';
import { ErrorState } from '@/components/shared/ErrorState';

export function MenuSearch({
  children,
  initialQuery = '',
}: {
  children: React.ReactNode;
  initialQuery?: string;
}) {
  const [query, setQuery] = useState(initialQuery);
  const [debouncedQuery, setDebouncedQuery] = useState(initialQuery);
  const [results, setResults] = useState<ProductCardData[] | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setDebouncedQuery(query.trim()), 350);
    return () => clearTimeout(debounceRef.current);
  }, [query]);

  useEffect(() => {
    if (!debouncedQuery) {
      setResults(null);
      return;
    }

    let cancelled = false;
    setIsLoading(true);
    setError(false);

    fetch(`/api/products?search=${encodeURIComponent(debouncedQuery)}`)
      .then((res) => res.json())
      .then((json) => {
        if (cancelled) return;
        if (!json.success) throw new Error(json.error);
        setResults(json.data);
      })
      .catch(() => {
        if (!cancelled) setError(true);
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [debouncedQuery]);

  return (
    <div>
      <div className="sticky top-14 z-20 border-b border-gray-100 bg-gray-50 px-4 py-3">
        <div className="relative">
          <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search dishes..."
            className="h-11 w-full rounded-xl border border-gray-200 bg-white pl-10 pr-10 text-sm focus:border-brand-500 focus:outline-none"
          />
          {query && (
            <button
              type="button"
              aria-label="Clear search"
              onClick={() => setQuery('')}
              className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center text-gray-400"
            >
              <X size={16} />
            </button>
          )}
        </div>
      </div>

      {debouncedQuery ? (
        <div className="px-4 py-4">
          {isLoading && <ProductGridSkeleton count={6} />}
          {!isLoading && error && (
            <ErrorState message="Could not search the menu right now." />
          )}
          {!isLoading && !error && results && results.length === 0 && (
            <EmptyState
              icon={<Search size={40} />}
              title="No dishes found"
              message={`Nothing matched "${debouncedQuery}". Try a different search.`}
            />
          )}
          {!isLoading && !error && results && results.length > 0 && (
            <div className="grid grid-cols-2 gap-3">
              {results.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          )}
        </div>
      ) : (
        children
      )}
    </div>
  );
}
