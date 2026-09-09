'use client';

import { cn } from '@/utils';
import { ORDER_STATUS_LABELS } from '@/lib/order-status';
import type { StatusCount } from './types';

const STATUS_COLORS: Record<string, string> = {
  PENDING: 'bg-amber-400',
  CONFIRMED: 'bg-blue-400',
  PREPARING: 'bg-indigo-400',
  READY: 'bg-purple-400',
  OUT_FOR_DELIVERY: 'bg-cyan-500',
  DELIVERED: 'bg-green-500',
  COMPLETED: 'bg-emerald-600',
  CANCELLED: 'bg-red-400',
  REJECTED: 'bg-red-600',
  REFUNDED: 'bg-gray-400',
};

export function StatusDistributionChart({ data }: { data: StatusCount[] }) {
  const total = data.reduce((s, d) => s + d.count, 0);
  const visible = data.filter((d) => d.count > 0);

  if (total === 0) {
    return (
      <div className="flex h-24 items-center justify-center rounded-2xl border border-gray-100 bg-white text-xs text-gray-400">
        No orders in this range yet.
      </div>
    );
  }

  const max = Math.max(...visible.map((d) => d.count));

  return (
    <div className="space-y-2.5 rounded-2xl border border-gray-100 bg-white p-4">
      {visible.map((d) => (
        <div key={d.status} className="flex items-center gap-2.5">
          <span className="w-24 shrink-0 truncate text-xs text-gray-600">
            {ORDER_STATUS_LABELS[d.status] ?? d.status}
          </span>
          <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-gray-100">
            <div
              className={cn('h-full rounded-full', STATUS_COLORS[d.status] ?? 'bg-gray-400')}
              style={{ width: `${Math.max((d.count / max) * 100, 4)}%` }}
            />
          </div>
          <span className="w-8 shrink-0 text-right text-xs font-semibold text-gray-900">{d.count}</span>
        </div>
      ))}
    </div>
  );
}
