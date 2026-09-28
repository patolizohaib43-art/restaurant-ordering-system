'use client';

import { useState } from 'react';
import { Tag, X, Loader2 } from 'lucide-react';
import { formatCurrency } from '@/utils';

interface AppliedCoupon {
  code: string;
  discountAmount: number;
}

interface CouponBoxProps {
  subtotal: number;
  currency: string;
  applied: AppliedCoupon | null;
  onApplied: (coupon: AppliedCoupon | null) => void;
}

export function CouponBox({ subtotal, currency, applied, onApplied }: CouponBoxProps) {
  const [code, setCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function applyCoupon() {
    if (!code.trim()) return;
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/coupons/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: code.trim(), subtotal }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        setError(json.error ?? 'Invalid coupon.');
        onApplied(null);
        return;
      }
      onApplied({ code: json.data.code, discountAmount: parseFloat(json.data.discountAmount) });
    } catch {
      setError('Could not validate coupon. Check your connection.');
    } finally {
      setIsLoading(false);
    }
  }

  if (applied) {
    return (
      <div className="flex items-center justify-between rounded-xl border border-green-200 bg-green-50 px-3.5 py-3">
        <div className="flex items-center gap-2 text-sm text-green-800">
          <Tag size={16} />
          <span>
            <strong>{applied.code}</strong> applied — you saved{' '}
            {formatCurrency(applied.discountAmount, currency)}
          </span>
        </div>
        <button
          type="button"
          aria-label="Remove coupon"
          onClick={() => {
            onApplied(null);
            setCode('');
          }}
          className="flex h-8 w-8 items-center justify-center rounded-full text-green-700 active:bg-green-100"
        >
          <X size={16} />
        </button>
      </div>
    );
  }

  return (
    <div>
      <div className="flex gap-2">
        <input
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          placeholder="Enter coupon code"
          className="h-11 flex-1 rounded-xl border border-gray-200 px-3.5 text-sm uppercase placeholder:normal-case focus:border-brand-500 focus:outline-none"
        />
        <button
          type="button"
          onClick={applyCoupon}
          disabled={isLoading || !code.trim()}
          className="flex h-11 items-center justify-center rounded-xl bg-gray-900 px-5 text-sm font-semibold text-white disabled:opacity-40"
        >
          {isLoading ? <Loader2 size={16} className="animate-spin" /> : 'Apply'}
        </button>
      </div>
      {error && <p className="mt-1.5 text-xs text-red-600">{error}</p>}
    </div>
  );
}
