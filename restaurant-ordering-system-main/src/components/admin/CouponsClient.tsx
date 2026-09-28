'use client';

import { useEffect, useState, useCallback } from 'react';
import { Plus, Pencil, Trash2, Loader2, Ticket } from 'lucide-react';
import { EmptyState } from '@/components/shared/EmptyState';
import { ErrorState } from '@/components/shared/ErrorState';
import { formatCurrency } from '@/utils';

interface Coupon {
  id: string;
  code: string;
  description: string | null;
  discountType: 'PERCENTAGE' | 'FIXED';
  discountValue: string;
  minOrderAmount: string | null;
  maxDiscountAmount: string | null;
  usageLimit: number | null;
  usedCount: number;
  validFrom: string;
  validUntil: string;
  isActive: boolean;
}

interface FormState {
  id: string | null;
  code: string;
  description: string;
  discountType: 'PERCENTAGE' | 'FIXED';
  discountValue: string;
  minOrderAmount: string;
  maxDiscountAmount: string;
  usageLimit: string;
  validFrom: string;
  validUntil: string;
  isActive: boolean;
}

function toDateInputValue(iso: string) {
  return iso.slice(0, 10);
}

const EMPTY_FORM: FormState = {
  id: null,
  code: '',
  description: '',
  discountType: 'PERCENTAGE',
  discountValue: '',
  minOrderAmount: '',
  maxDiscountAmount: '',
  usageLimit: '',
  validFrom: new Date().toISOString().slice(0, 10),
  validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
  isActive: true,
};

export function CouponsClient() {
  const [coupons, setCoupons] = useState<Coupon[] | null>(null);
  const [error, setError] = useState(false);
  const [form, setForm] = useState<FormState | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/coupons', { cache: 'no-store' });
      const json = await res.json();
      if (!json.success) throw new Error();
      setCoupons(json.data);
      setError(false);
    } catch {
      setError(true);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function handleSave() {
    if (!form) return;
    setIsSaving(true);
    setSaveError(null);
    try {
      const payload = {
        code: form.code.trim().toUpperCase(),
        description: form.description.trim() || undefined,
        discountType: form.discountType,
        discountValue: parseFloat(form.discountValue),
        minOrderAmount: form.minOrderAmount ? parseFloat(form.minOrderAmount) : null,
        maxDiscountAmount: form.maxDiscountAmount ? parseFloat(form.maxDiscountAmount) : null,
        usageLimit: form.usageLimit ? parseInt(form.usageLimit, 10) : null,
        validFrom: new Date(form.validFrom).toISOString(),
        validUntil: new Date(form.validUntil).toISOString(),
        isActive: form.isActive,
      };
      const res = await fetch(form.id ? `/api/admin/coupons/${form.id}` : '/api/admin/coupons', {
        method: form.id ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        setSaveError(json.error ?? 'Could not save coupon.');
        return;
      }
      setForm(null);
      await load();
    } catch {
      setSaveError('Network error. Please try again.');
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete(coupon: Coupon) {
    if (!confirm(`Delete coupon "${coupon.code}"?`)) return;
    await fetch(`/api/admin/coupons/${coupon.id}`, { method: 'DELETE' });
    await load();
  }

  async function toggleActive(coupon: Coupon) {
    await fetch(`/api/admin/coupons/${coupon.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isActive: !coupon.isActive }),
    });
    await load();
  }

  if (error && !coupons) return <ErrorState message="Could not load coupons." onRetry={load} />;
  if (!coupons) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="animate-spin text-gray-300" size={28} />
      </div>
    );
  }

  return (
    <div className="px-4 py-4">
      <button
        type="button"
        onClick={() => setForm(EMPTY_FORM)}
        className="mb-4 flex h-11 w-full items-center justify-center gap-2 rounded-2xl bg-brand-600 text-sm font-bold text-white"
      >
        <Plus size={18} /> Add Coupon
      </button>

      {coupons.length === 0 ? (
        <EmptyState icon={<Ticket size={40} />} title="No coupons yet" message="Create your first discount code." />
      ) : (
        <div className="space-y-2.5">
          {coupons.map((coupon) => (
            <div key={coupon.id} className="rounded-2xl border border-gray-100 bg-white p-3.5">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-mono text-sm font-bold text-gray-900">{coupon.code}</p>
                  <p className="text-xs text-gray-500">
                    {coupon.discountType === 'PERCENTAGE'
                      ? `${parseFloat(coupon.discountValue)}% off`
                      : `${formatCurrency(coupon.discountValue, 'PKR')} off`}
                    {coupon.minOrderAmount && ` · Min ${formatCurrency(coupon.minOrderAmount, 'PKR')}`}
                  </p>
                  <p className="text-xs text-gray-400">
                    Used {coupon.usedCount}
                    {coupon.usageLimit ? ` / ${coupon.usageLimit}` : ''} · Expires{' '}
                    {toDateInputValue(coupon.validUntil)}
                  </p>
                </div>
                <label className="flex shrink-0 items-center gap-1.5 text-xs">
                  <input
                    type="checkbox"
                    checked={coupon.isActive}
                    onChange={() => toggleActive(coupon)}
                    className="h-4 w-4"
                  />
                  Active
                </label>
              </div>
              <div className="mt-2.5 flex gap-1.5">
                <button
                  type="button"
                  onClick={() =>
                    setForm({
                      id: coupon.id,
                      code: coupon.code,
                      description: coupon.description ?? '',
                      discountType: coupon.discountType,
                      discountValue: coupon.discountValue,
                      minOrderAmount: coupon.minOrderAmount ?? '',
                      maxDiscountAmount: coupon.maxDiscountAmount ?? '',
                      usageLimit: coupon.usageLimit?.toString() ?? '',
                      validFrom: toDateInputValue(coupon.validFrom),
                      validUntil: toDateInputValue(coupon.validUntil),
                      isActive: coupon.isActive,
                    })
                  }
                  className="flex h-9 flex-1 items-center justify-center gap-1.5 rounded-lg border border-gray-200 text-xs font-semibold text-gray-700"
                >
                  <Pencil size={13} /> Edit
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(coupon)}
                  className="flex h-9 w-9 items-center justify-center rounded-lg border border-red-200 text-red-500"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {form && (
        <div className="fixed inset-0 z-40 flex items-end bg-black/40" onClick={() => setForm(null)}>
          <div
            className="max-h-[85vh] w-full overflow-y-auto rounded-t-3xl bg-white p-4 pb-8"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="mb-4 text-base font-bold text-gray-900">
              {form.id ? 'Edit Coupon' : 'Add Coupon'}
            </h2>
            <div className="space-y-3">
              <label className="block">
                <span className="mb-1.5 block text-sm font-medium text-gray-700">Code</span>
                <input
                  value={form.code}
                  onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
                  className="input uppercase"
                  placeholder="e.g. WELCOME10"
                  disabled={!!form.id}
                />
              </label>
              <label className="block">
                <span className="mb-1.5 block text-sm font-medium text-gray-700">Description</span>
                <input
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className="input"
                />
              </label>
              <div className="grid grid-cols-2 gap-3">
                <label className="block">
                  <span className="mb-1.5 block text-sm font-medium text-gray-700">Type</span>
                  <select
                    value={form.discountType}
                    onChange={(e) =>
                      setForm({ ...form, discountType: e.target.value as 'PERCENTAGE' | 'FIXED' })
                    }
                    className="input"
                  >
                    <option value="PERCENTAGE">Percentage</option>
                    <option value="FIXED">Fixed</option>
                  </select>
                </label>
                <label className="block">
                  <span className="mb-1.5 block text-sm font-medium text-gray-700">
                    Value {form.discountType === 'PERCENTAGE' ? '(%)' : '(PKR)'}
                  </span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.discountValue}
                    onChange={(e) => setForm({ ...form, discountValue: e.target.value })}
                    className="input"
                  />
                </label>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <label className="block">
                  <span className="mb-1.5 block text-sm font-medium text-gray-700">Min Order</span>
                  <input
                    type="number"
                    min="0"
                    value={form.minOrderAmount}
                    onChange={(e) => setForm({ ...form, minOrderAmount: e.target.value })}
                    className="input"
                    placeholder="Optional"
                  />
                </label>
                <label className="block">
                  <span className="mb-1.5 block text-sm font-medium text-gray-700">Max Discount</span>
                  <input
                    type="number"
                    min="0"
                    value={form.maxDiscountAmount}
                    onChange={(e) => setForm({ ...form, maxDiscountAmount: e.target.value })}
                    className="input"
                    placeholder="Optional"
                  />
                </label>
              </div>
              <label className="block">
                <span className="mb-1.5 block text-sm font-medium text-gray-700">Usage Limit</span>
                <input
                  type="number"
                  min="1"
                  value={form.usageLimit}
                  onChange={(e) => setForm({ ...form, usageLimit: e.target.value })}
                  className="input"
                  placeholder="Optional — unlimited if blank"
                />
              </label>
              <div className="grid grid-cols-2 gap-3">
                <label className="block">
                  <span className="mb-1.5 block text-sm font-medium text-gray-700">Valid From</span>
                  <input
                    type="date"
                    value={form.validFrom}
                    onChange={(e) => setForm({ ...form, validFrom: e.target.value })}
                    className="input"
                  />
                </label>
                <label className="block">
                  <span className="mb-1.5 block text-sm font-medium text-gray-700">Expiry</span>
                  <input
                    type="date"
                    value={form.validUntil}
                    onChange={(e) => setForm({ ...form, validUntil: e.target.value })}
                    className="input"
                  />
                </label>
              </div>
              <label className="flex items-center gap-2 text-sm text-gray-700">
                <input
                  type="checkbox"
                  checked={form.isActive}
                  onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
                  className="h-4 w-4"
                />
                Active
              </label>
            </div>

            {saveError && <p className="mt-3 text-sm text-red-600">{saveError}</p>}

            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={() => setForm(null)}
                className="h-12 flex-1 rounded-2xl border border-gray-300 text-sm font-semibold text-gray-700"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={isSaving || !form.code.trim() || !form.discountValue}
                className="flex h-12 flex-1 items-center justify-center rounded-2xl bg-brand-600 text-sm font-bold text-white disabled:opacity-40"
              >
                {isSaving ? <Loader2 size={18} className="animate-spin" /> : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
