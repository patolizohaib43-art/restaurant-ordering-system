'use client';

import { Minus, Plus } from 'lucide-react';

interface QuantityStepperProps {
  quantity: number;
  onChange: (quantity: number) => void;
  min?: number;
  max?: number;
  size?: 'sm' | 'md';
}

export function QuantityStepper({
  quantity,
  onChange,
  min = 1,
  max = 50,
  size = 'md',
}: QuantityStepperProps) {
  // Touch targets stay >=36px even in the compact "sm" variant used in
  // tight list rows (e.g. cart) — small enough to fit, still comfortable
  // to tap on a phone.
  const dim = size === 'sm' ? 'h-9 w-9' : 'h-11 w-11';

  return (
    <div className="flex items-center gap-1 rounded-full border border-gray-200">
      <button
        type="button"
        aria-label="Decrease quantity"
        disabled={quantity <= min}
        onClick={() => onChange(Math.max(min, quantity - 1))}
        className={`flex ${dim} items-center justify-center rounded-full text-gray-700 disabled:text-gray-300 active:bg-gray-100`}
      >
        <Minus size={16} aria-hidden="true" />
      </button>
      <span className="w-6 text-center text-sm font-semibold tabular-nums" aria-live="polite">
        {quantity}
      </span>
      <button
        type="button"
        aria-label="Increase quantity"
        disabled={quantity >= max}
        onClick={() => onChange(Math.min(max, quantity + 1))}
        className={`flex ${dim} items-center justify-center rounded-full text-gray-700 disabled:text-gray-300 active:bg-gray-100`}
      >
        <Plus size={16} aria-hidden="true" />
      </button>
    </div>
  );
}
