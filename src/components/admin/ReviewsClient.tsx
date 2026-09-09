'use client';

import { useEffect, useState, useCallback } from 'react';
import { Loader2, Star, Check, X, Trash2 } from 'lucide-react';
import { StarRatingDisplay } from '@/components/customer/StarRating';
import { EmptyState } from '@/components/shared/EmptyState';
import { ErrorState } from '@/components/shared/ErrorState';

interface Review {
  id: string;
  productName: string;
  customerName: string;
  rating: number;
  comment: string | null;
  isApproved: boolean;
  createdAt: string;
}

export function ReviewsClient() {
  const [reviews, setReviews] = useState<Review[] | null>(null);
  const [error, setError] = useState(false);
  const [filter, setFilter] = useState<'ALL' | 'PENDING' | 'APPROVED'>('ALL');

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/reviews', { cache: 'no-store' });
      const json = await res.json();
      if (!json.success) throw new Error();
      setReviews(json.data);
      setError(false);
    } catch {
      setError(true);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function setApproved(review: Review, isApproved: boolean) {
    await fetch(`/api/admin/reviews/${review.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isApproved }),
    });
    await load();
  }

  async function handleDelete(review: Review) {
    if (!confirm('Delete this review?')) return;
    await fetch(`/api/admin/reviews/${review.id}`, { method: 'DELETE' });
    await load();
  }

  if (error && !reviews) return <ErrorState message="Could not load reviews." onRetry={load} />;
  if (!reviews) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="animate-spin text-gray-300" size={28} />
      </div>
    );
  }

  const filtered = reviews.filter((r) =>
    filter === 'ALL' ? true : filter === 'PENDING' ? !r.isApproved : r.isApproved
  );

  return (
    <div className="px-4 py-4">
      <div className="mb-4 flex gap-2">
        {(['ALL', 'PENDING', 'APPROVED'] as const).map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setFilter(f)}
            className={`flex-1 rounded-full border px-3 py-2 text-xs font-semibold ${
              filter === f ? 'border-brand-600 bg-brand-600 text-white' : 'border-gray-200 bg-white text-gray-600'
            }`}
          >
            {f === 'ALL' ? 'All' : f === 'PENDING' ? 'Pending' : 'Approved'}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={<Star size={40} />} title="No reviews" message="Nothing to show for this filter." />
      ) : (
        <div className="space-y-2.5">
          {filtered.map((review) => (
            <div key={review.id} className="rounded-2xl border border-gray-100 bg-white p-3.5">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-gray-900">{review.productName}</span>
                <StarRatingDisplay rating={review.rating} />
              </div>
              <p className="mt-0.5 text-xs text-gray-400">{review.customerName}</p>
              {review.comment && <p className="mt-1.5 text-sm text-gray-600">{review.comment}</p>}
              <div className="mt-2.5 flex items-center gap-1.5">
                {review.isApproved ? (
                  <span className="rounded-full bg-green-50 px-2.5 py-1 text-[11px] font-semibold text-green-700">
                    Approved
                  </span>
                ) : (
                  <span className="rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-semibold text-amber-700">
                    Pending
                  </span>
                )}
                <div className="ml-auto flex gap-1.5">
                  {!review.isApproved && (
                    <button
                      type="button"
                      onClick={() => setApproved(review, true)}
                      className="flex h-9 items-center gap-1 rounded-lg border border-green-200 px-3 text-xs font-semibold text-green-700"
                    >
                      <Check size={13} /> Approve
                    </button>
                  )}
                  {review.isApproved && (
                    <button
                      type="button"
                      onClick={() => setApproved(review, false)}
                      className="flex h-9 items-center gap-1 rounded-lg border border-gray-200 px-3 text-xs font-semibold text-gray-600"
                    >
                      <X size={13} /> Unapprove
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => handleDelete(review)}
                    className="flex h-9 w-9 items-center justify-center rounded-lg border border-red-200 text-red-500"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
