'use client';

import { useState } from 'react';
import { cn } from '@/utils';
import { OverviewTab } from './reports/OverviewTab';
import { SalesTab } from './reports/SalesTab';
import { PromotionsTab } from './reports/PromotionsTab';

const TABS = [
  { key: 'overview', label: 'Overview' },
  { key: 'sales', label: 'Sales' },
  { key: 'promotions', label: 'Promotions' },
] as const;

type TabKey = (typeof TABS)[number]['key'];

// Matches the currency convention already used by DashboardClient
// (Phase 4) so every money figure in the admin panel stays consistent.
const ADMIN_CURRENCY = 'PKR';

export function ReportsClient() {
  const [tab, setTab] = useState<TabKey>('overview');
  const currency = ADMIN_CURRENCY;

  return (
    <div className="px-4 py-4">
      <div className="mb-4 flex gap-1 rounded-2xl border border-gray-100 bg-white p-1">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className={cn(
              'h-10 flex-1 rounded-xl text-sm font-semibold',
              tab === t.key ? 'bg-brand-600 text-white' : 'text-gray-500'
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'overview' && <OverviewTab currency={currency} />}
      {tab === 'sales' && <SalesTab currency={currency} />}
      {tab === 'promotions' && <PromotionsTab currency={currency} />}
    </div>
  );
}
