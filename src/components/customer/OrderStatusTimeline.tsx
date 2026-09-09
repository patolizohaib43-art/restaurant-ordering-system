import { Check, X, Clock } from 'lucide-react';
import { cn } from '@/utils';

const HAPPY_PATH = [
  { status: 'PENDING', label: 'Order Placed' },
  { status: 'CONFIRMED', label: 'Accepted' },
  { status: 'PREPARING', label: 'Preparing' },
  { status: 'READY', label: 'Ready' },
  { status: 'OUT_FOR_DELIVERY', label: 'Out for Delivery' },
  { status: 'DELIVERED', label: 'Delivered' },
] as const;

const TERMINAL_NEGATIVE = ['REJECTED', 'CANCELLED'];

interface StatusHistoryEntry {
  status: string;
  note: string | null;
  createdAt: string;
}

export function OrderStatusTimeline({
  currentStatus,
  orderType,
  history,
}: {
  currentStatus: string;
  orderType: 'DELIVERY' | 'PICKUP' | 'DINE_IN';
  history: StatusHistoryEntry[];
}) {
  if (TERMINAL_NEGATIVE.includes(currentStatus)) {
    const entry = history.find((h) => h.status === currentStatus);
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-100 text-red-600">
            <X size={20} />
          </div>
          <div>
            <p className="font-semibold text-red-800">
              {currentStatus === 'REJECTED' ? 'Order Rejected' : 'Order Cancelled'}
            </p>
            {entry?.note && <p className="mt-0.5 text-sm text-red-700">{entry.note}</p>}
          </div>
        </div>
      </div>
    );
  }

  // Pickup/dine-in orders skip the delivery-specific step
  const steps = HAPPY_PATH.filter(
    (s) => orderType === 'DELIVERY' || s.status !== 'OUT_FOR_DELIVERY'
  );
  const currentIndex = steps.findIndex((s) => s.status === currentStatus);

  return (
    <ol className="space-y-0">
      {steps.map((step, index) => {
        const isDone = index < currentIndex || (index === currentIndex && currentStatus === 'DELIVERED');
        const isCurrent = index === currentIndex && currentStatus !== 'DELIVERED';
        const historyEntry = history.find((h) => h.status === step.status);
        const isLast = index === steps.length - 1;

        return (
          <li key={step.status} className="relative flex gap-3 pb-7 last:pb-0">
            {!isLast && (
              <span
                className={cn(
                  'absolute left-[15px] top-8 h-full w-0.5',
                  index < currentIndex ? 'bg-brand-500' : 'bg-gray-200'
                )}
              />
            )}
            <span
              className={cn(
                'z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full',
                isDone || isCurrent
                  ? 'bg-brand-600 text-white'
                  : 'bg-gray-100 text-gray-400'
              )}
            >
              {isDone ? <Check size={16} /> : isCurrent ? <Clock size={15} /> : null}
            </span>
            <div className="pt-1">
              <p
                className={cn(
                  'text-sm font-semibold',
                  isDone || isCurrent ? 'text-gray-900' : 'text-gray-400'
                )}
              >
                {step.label}
              </p>
              {historyEntry && (
                <p className="mt-0.5 text-xs text-gray-400">
                  {new Date(historyEntry.createdAt).toLocaleString(undefined, {
                    hour: '2-digit',
                    minute: '2-digit',
                    month: 'short',
                    day: 'numeric',
                  })}
                </p>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
