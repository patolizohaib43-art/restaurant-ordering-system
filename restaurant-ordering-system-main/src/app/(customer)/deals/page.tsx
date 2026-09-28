import { getActiveDeals } from '@/lib/queries';
import { getPublicSettings } from '@/lib/settings';
import { DealCard } from '@/components/customer/DealCard';
import { EmptyState } from '@/components/shared/EmptyState';
import { Tag } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function DealsPage() {
  const [deals, settings] = await Promise.all([getActiveDeals(30), getPublicSettings()]);

  return (
    <div className="px-4 py-4">
      {deals.length === 0 ? (
        <EmptyState
          icon={<Tag size={40} />}
          title="No active deals"
          message="Check back soon for special offers and discounts."
          actionHref="/menu"
          actionLabel="Browse menu"
        />
      ) : (
        <div className="grid grid-cols-1 gap-3">
          {deals.map((deal) => (
            <DealCard key={deal.id} deal={deal} currency={settings.currency} className="w-full" />
          ))}
        </div>
      )}
    </div>
  );
}
