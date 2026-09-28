'use client';

import { useState } from 'react';
import { Loader2, Trash2, AlertTriangle } from 'lucide-react';
import { useAdminSession } from '@/components/admin/AdminSessionProvider';

/**
 * ADMIN-ONLY "Clear Test Orders / Reset Order History". Rendered only for
 * SUPER_ADMIN; the API enforces the same rule server-side. Only order
 * data is deleted — never products, categories, deals, coupons,
 * settings, delivery areas or admin accounts.
 */
export function ResetOrdersSection() {
  const { role } = useAdminSession();
  const [mode, setMode] = useState<'ALL' | 'BEFORE_DATE'>('ALL');
  const [beforeDate, setBeforeDate] = useState('');
  const [confirmText, setConfirmText] = useState('');
  const [count, setCount] = useState<number | null>(null);
  const [isBusy, setIsBusy] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  if (role !== 'SUPER_ADMIN') return null;

  const dateMissing = mode === 'BEFORE_DATE' && !beforeDate;

  async function preview() {
    setMessage(null);
    setIsBusy(true);
    try {
      const qs = mode === 'BEFORE_DATE' && beforeDate ? `?before=${beforeDate}` : '';
      const res = await fetch(`/api/admin/orders/reset${qs}`, { cache: 'no-store' });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error);
      setCount(json.data.orderCount);
    } catch (e: any) {
      setMessage({ ok: false, text: e?.message || 'Could not count orders.' });
    } finally {
      setIsBusy(false);
    }
  }

  async function run() {
    if (dateMissing || confirmText !== 'DELETE') return;
    if (!window.confirm('This will permanently delete existing test orders. Continue?')) return;
    setIsBusy(true);
    setMessage(null);
    try {
      const res = await fetch('/api/admin/orders/reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode, beforeDate: beforeDate || undefined, confirmText }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error);
      setMessage({
        ok: true,
        text: `Deleted ${json.data.deletedOrders} order(s). Products, settings and everything else are untouched.`,
      });
      setConfirmText('');
      setCount(null);
    } catch (e: any) {
      setMessage({ ok: false, text: e?.message || 'Could not clear orders.' });
    } finally {
      setIsBusy(false);
    }
  }

  return (
    <section className="mx-4 mb-10 rounded-2xl border border-red-200 bg-white p-4">
      <div className="mb-2 flex items-center gap-2">
        <AlertTriangle size={16} className="text-red-600" />
        <h2 className="text-sm font-semibold text-red-700">Clear Test Orders / Reset Order History</h2>
      </div>
      <p className="text-xs text-gray-500">
        Permanently deletes orders and their items, status history, reviews and notifications. Products,
        categories, deals, coupons, delivery areas, settings and admin accounts are NOT deleted. Use once
        before going live.
      </p>

      <div className="mt-3 grid grid-cols-2 gap-2">
        {(
          [
            ['ALL', 'All orders'],
            ['BEFORE_DATE', 'Before a date'],
          ] as const
        ).map(([value, label]) => (
          <button
            key={value}
            type="button"
            onClick={() => {
              setMode(value);
              setCount(null);
            }}
            className={`h-10 rounded-xl border text-sm font-medium ${
              mode === value ? 'border-red-500 bg-red-50 text-red-700' : 'border-gray-200 text-gray-600'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {mode === 'BEFORE_DATE' && (
        <div className="mt-3">
          <label className="mb-1.5 block text-sm font-medium text-gray-700">
            Delete orders placed before
          </label>
          <input
            type="date"
            value={beforeDate}
            onChange={(e) => {
              setBeforeDate(e.target.value);
              setCount(null);
            }}
            className="input"
          />
          <p className="mt-1 text-[11px] text-gray-400">
            Orders on this date and later are kept (e.g. pick the 1st to keep launch day).
          </p>
        </div>
      )}

      <button
        type="button"
        onClick={preview}
        disabled={isBusy || dateMissing}
        className="mt-3 h-10 w-full rounded-xl border border-gray-300 text-sm font-semibold text-gray-700 disabled:opacity-40"
      >
        {count === null ? 'Check how many orders will be deleted' : `${count} order(s) will be deleted`}
      </button>

      <label className="mb-1.5 mt-3 block text-sm font-medium text-gray-700">
        Type <span className="font-mono font-bold">DELETE</span> to confirm
      </label>
      <input
        value={confirmText}
        onChange={(e) => setConfirmText(e.target.value)}
        className="input"
        placeholder="DELETE"
        autoCapitalize="characters"
        autoComplete="off"
      />

      <button
        type="button"
        onClick={run}
        disabled={isBusy || dateMissing || confirmText !== 'DELETE'}
        className="mt-3 flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-red-600 text-sm font-semibold text-white disabled:opacity-40"
      >
        {isBusy ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
        Clear Test Orders
      </button>

      {message && (
        <p className={`mt-3 text-xs ${message.ok ? 'text-green-700' : 'text-red-600'}`}>{message.text}</p>
      )}
    </section>
  );
}
