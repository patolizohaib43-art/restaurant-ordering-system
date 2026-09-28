'use client';

import { useState } from 'react';
import { formatCurrency } from '@/utils';
import type { DailySalesPoint } from './types';

const BAR_WIDTH = 34;
const GAP = 10;
const CHART_HEIGHT = 140;

/** Dependency-free SVG bar chart — keeps the Reports screen light on mobile. */
export function DailySalesChart({ data, currency }: { data: DailySalesPoint[]; currency: string }) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  if (data.length === 0) {
    return (
      <div className="flex h-32 items-center justify-center rounded-2xl border border-gray-100 bg-white text-xs text-gray-400">
        No sales in this range yet.
      </div>
    );
  }

  const max = Math.max(...data.map((d) => d.total), 1);
  const width = data.length * (BAR_WIDTH + GAP) + GAP;
  const active = activeIndex !== null ? data[activeIndex] : null;

  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-4">
      <div className="mb-2 h-9 text-sm font-semibold text-gray-900">
        {active ? (
          <>
            {formatCurrency(active.total, currency)}
            <span className="ml-2 text-xs font-normal text-gray-400">
              {new Date(active.date).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
              {' · '}
              {active.orders} order{active.orders === 1 ? '' : 's'}
            </span>
          </>
        ) : (
          <span className="text-xs font-normal text-gray-400">Tap a bar to see details</span>
        )}
      </div>
      <div className="overflow-x-auto">
        <svg
          viewBox={`0 0 ${width} ${CHART_HEIGHT}`}
          width={Math.min(width, 700)}
          height={CHART_HEIGHT}
          role="img"
          aria-label="Daily sales chart"
        >
          {data.map((d, i) => {
            const barHeight = Math.max((d.total / max) * (CHART_HEIGHT - 28), d.total > 0 ? 3 : 0);
            const x = GAP + i * (BAR_WIDTH + GAP);
            const y = CHART_HEIGHT - 20 - barHeight;
            const isActive = activeIndex === i;
            return (
              <g key={d.date} onClick={() => setActiveIndex(isActive ? null : i)} className="cursor-pointer">
                <rect x={x} y={CHART_HEIGHT - 20} width={BAR_WIDTH} height={20} fill="transparent" />
                <rect
                  x={x}
                  y={y}
                  width={BAR_WIDTH}
                  height={barHeight}
                  rx={5}
                  fill={isActive ? '#d21f1f' : '#f5a90b'}
                />
                <text
                  x={x + BAR_WIDTH / 2}
                  y={CHART_HEIGHT - 6}
                  textAnchor="middle"
                  fontSize="9"
                  fill="#9ca3af"
                >
                  {new Date(d.date).toLocaleDateString(undefined, { weekday: 'narrow' })}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}
