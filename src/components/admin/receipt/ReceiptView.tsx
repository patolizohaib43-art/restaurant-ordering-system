'use client';

import { useEffect, useRef, useState } from 'react';
import { Printer, X, Loader2 } from 'lucide-react';
import { ThermalReceipt } from '@/components/admin/receipt/ThermalReceipt';
import { ErrorState } from '@/components/shared/ErrorState';
import type { ReceiptOrderView } from '@/lib/receipt';

interface ReceiptSettings {
  restaurantName: string;
  address: string | null;
  phone: string | null;
  currency: string;
  receiptWidth: 'MM_58' | 'MM_80';
}

interface ReceiptData {
  order: ReceiptOrderView;
  settings: ReceiptSettings;
}

/**
 * Standalone print view for one order's thermal receipt.
 *
 * Opens (usually in a new tab from the "Print Receipt" button) and
 * automatically triggers the browser's print dialog. This relies on the
 * OS/browser print dialog to talk to whatever printer the admin has set
 * up (USB, Bluetooth, or network) — there is no direct silent printing
 * to a thermal printer here. If a print bridge/native driver is needed
 * for a specific printer, that is a separate integration documented in
 * the Phase 4 notes, not something this page fakes.
 */
export function ReceiptView({ orderId }: { orderId: string }) {
  const [data, setData] = useState<ReceiptData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const hasAutoPrinted = useRef(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch(`/api/admin/orders/${orderId}/receipt`, { cache: 'no-store' });
        const json = await res.json();
        if (cancelled) return;
        if (!res.ok || !json.success) {
          setError(json.error ?? 'Could not load this receipt.');
          return;
        }
        setData(json.data);
      } catch {
        if (!cancelled) setError('Network error while loading the receipt.');
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [orderId]);

  useEffect(() => {
    if (data && !hasAutoPrinted.current) {
      hasAutoPrinted.current = true;
      // Give the DOM a moment to paint before invoking print.
      const t = setTimeout(() => window.print(), 200);
      return () => clearTimeout(t);
    }
  }, [data]);

  if (error) {
    return (
      <div className="receipt-page">
        <ErrorState title="Receipt unavailable" message={error} />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="receipt-page">
        <Loader2 className="animate-spin text-gray-400" size={28} />
      </div>
    );
  }

  return (
    <div className="receipt-page">
      <div className="receipt-actions">
        <button
          type="button"
          onClick={() => window.print()}
          className="flex h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-brand-600 text-sm font-semibold text-white"
        >
          <Printer size={16} /> Print Receipt
        </button>
        <button
          type="button"
          onClick={() => window.close()}
          className="flex h-11 items-center justify-center gap-2 rounded-xl border border-gray-300 px-4 text-sm font-semibold text-gray-700"
        >
          <X size={16} /> Close
        </button>
      </div>

      <ThermalReceipt order={data.order} settings={data.settings} />
    </div>
  );
}
