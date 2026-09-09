'use client';

import { useState } from 'react';
import { Check, Loader2 } from 'lucide-react';
import { StarRatingInput } from '@/components/customer/StarRating';

export function ProductReviewForm({
  token,
  productId,
  productName,
  onSubmitted,
}: {
  token: string;
  productId: string;
  productName: string;
  onSubmitted: (productId: string) => void;
}) {
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function handleSubmit() {
    if (rating === 0 || isSubmitting) return;
    setIsSubmitting(true);
    setError(null);

    try {
      const res = await fetch('/api/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ trackingToken: token, productId, rating, comment }),
      });
      const json = await res.json();

      if (!res.ok || !json.success) {
        setError(json.error ?? 'Could not submit review.');
        setIsSubmitting(false);
        return;
      }

      setDone(true);
      onSubmitted(productId);
    } catch {
      setError('Network error. Please try again.');
      setIsSubmitting(false);
    }
  }

  if (done) {
    return (
      <div className="flex items-center gap-3 rounded-2xl border border-green-200 bg-green-50 p-4">
        <Check size={20} className="text-green-600" />
        <div>
          <p className="text-sm font-semibold text-green-800">{productName}</p>
          <p className="text-xs text-green-700">Thanks for your review!</p>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-4">
      <p className="mb-3 text-sm font-semibold text-gray-900">{productName}</p>
      <StarRatingInput value={rating} onChange={setRating} />
      <textarea
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        maxLength={500}
        rows={2}
        placeholder="Share your thoughts (optional)"
        className="input mt-3 resize-none"
      />
      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
      <button
        type="button"
        onClick={handleSubmit}
        disabled={rating === 0 || isSubmitting}
        className="mt-3 flex h-11 w-full items-center justify-center rounded-xl bg-gray-900 text-sm font-semibold text-white disabled:opacity-40"
      >
        {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : 'Submit Review'}
      </button>
    </div>
  );
}
