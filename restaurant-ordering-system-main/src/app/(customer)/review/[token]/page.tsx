'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, CheckCircle2 } from 'lucide-react';
import { ProductReviewForm } from '@/components/customer/ProductReviewForm';
import { EmptyState } from '@/components/shared/EmptyState';
import { ErrorState } from '@/components/shared/ErrorState';
import type { OrderDetailView } from '@/lib/queries';

export default function ReviewPage({ params }: { params: { token: string } }) {
  const [order, setOrder] = useState<OrderDetailView | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reviewedIds, setReviewedIds] = useState<string[]>([]);
  const router = useRouter();

  useEffect(() => {
    fetch(`/api/orders/track/${params.token}`)
      .then((res) => res.json())
      .then((json) => {
        if (!json.success) {
          setError(json.error ?? 'Order not found.');
          return;
        }
        setOrder(json.data);
        setReviewedIds(json.data.reviewedProductIds);
      })
      .catch(() => setError('Could not load your order.'));
  }, [params.token]);

  if (error) return <ErrorState title="Could not load order" message={error} />;

  if (!order) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Loader2 className="animate-spin text-gray-300" size={28} />
      </div>
    );
  }

  if (order.status !== 'DELIVERED' && order.status !== 'COMPLETED') {
    return (
      <EmptyState
        title="Not ready to review yet"
        message="You can review your order once it has been delivered."
        actionHref={`/track/${params.token}`}
        actionLabel="Track my order"
      />
    );
  }

  // Deduplicate products (an order could contain the same product only once
  // per line normally, but guard anyway) and split reviewed vs pending.
  type ReviewableItem = OrderDetailView['items'][number] & { productId: string };

  const productMap = new Map<string, ReviewableItem>();
  for (const item of order.items) {
    if (item.productId) {
      productMap.set(item.productId, item as ReviewableItem);
    }
  }
  const uniqueProducts = Array.from(productMap.values());

  const pending = uniqueProducts.filter((p) => !reviewedIds.includes(p.productId));
  const reviewed = uniqueProducts.filter((p) => reviewedIds.includes(p.productId));

  return (
    <div className="px-4 py-5">
      <h1 className="text-lg font-bold text-gray-900">Rate your order</h1>
      <p className="mt-1 text-sm text-gray-500">
        Order {order.orderNumber} — your feedback helps us improve.
      </p>

      {pending.length === 0 && reviewed.length > 0 && (
        <div className="mt-6 flex flex-col items-center rounded-2xl border border-gray-100 bg-white py-10 text-center">
          <CheckCircle2 size={40} className="text-green-500" />
          <p className="mt-3 text-sm font-medium text-gray-700">
            You&apos;ve reviewed everything in this order. Thank you!
          </p>
          <button
            type="button"
            onClick={() => router.push('/menu')}
            className="mt-4 text-sm font-semibold text-brand-600"
          >
            Back to menu
          </button>
        </div>
      )}

      {pending.length > 0 && (
        <div className="mt-5 space-y-3">
          {pending.map((item) => (
            <ProductReviewForm
              key={item.productId}
              token={params.token}
              productId={item.productId}
              productName={item.productName}
              onSubmitted={(id) => setReviewedIds((prev) => [...prev, id])}
            />
          ))}
        </div>
      )}

      {reviewed.length > 0 && pending.length > 0 && (
        <div className="mt-6">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">
            Already reviewed
          </p>
          <div className="space-y-2">
            {reviewed.map((item) => (
              <div
                key={item.productId}
                className="rounded-xl border border-gray-100 bg-gray-50 px-4 py-3 text-sm text-gray-500"
              >
                {item.productName}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
