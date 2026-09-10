'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { Plus, Pencil, Trash2, Loader2, Tag as TagIcon, Ticket } from 'lucide-react';
import { EmptyState } from '@/components/shared/EmptyState';
import { ErrorState } from '@/components/shared/ErrorState';
import { ImageUploadField } from '@/components/admin/ImageUploadField';
import { formatCurrency } from '@/utils';

interface Deal {
  id: string;
  title: string;
  description: string | null;
  imageUrl: string | null;
  discountType: 'PERCENTAGE' | 'FIXED';
  discountValue: string;
  minOrderAmount: string | null;
  startDate: string;
  endDate: string;
  isActive: boolean;
}

interface FormState {
  id: string | null;
  title: string;
  description: string;
  imageUrl: string;
  discountType: 'PERCENTAGE' | 'FIXED';
  discountValue: string;
  minOrderAmount: string;
  startDate: string;
  endDate: string;
  isActive: boolean;
}

function toDateInputValue(iso: string) {
  return iso.slice(0, 10);
}

const EMPTY_FORM: FormState = {
  id: null,
  title: '',
  description: '',
  imageUrl: '',
  discountType: 'PERCENTAGE',
  discountValue: '',
  minOrderAmount: '',
  startDate: new Date().toISOString().slice(0, 10),
  endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
  isActive: true,
};

export function DealsClient() {
  const [deals, setDeals] = useState<Deal[] | null>(null);
  const [error, setError] = useState(false);
  const [form, setForm] = useState<FormState | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/deals', { cache: 'no-store' });
      const json = await res.json();
      if (!json.success) throw new Error();
      setDeals(json.data);
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
        title: form.title.trim(),
        description: form.description.trim() || undefined,
        imageUrl: form.imageUrl.trim() || undefined,
        discountType: form.discountType,
        discountValue: parseFloat(form.discountValue),
        minOrderAmount: form.minOrderAmount ? parseFloat(form.minOrderAmount) : null,
        startDate: new Date(form.startDate).toISOString(),
        endDate: new Date(form.endDate).toISOString(),
        isActive: form.isActive,
      };
      const res = await fetch(form.id ? `/api/admin/deals/${form.id}` : '/api/admin/deals', {
        method: form.id ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        setSaveError(json.error ?? 'Could not save deal.');
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

  async function handleDelete(deal: Deal) {
    if (!confirm(`Delete "${deal.title}"?`)) return;
    await fetch(`/api/admin/deals/${deal.id}`, { method: 'DELETE' });
    await load();
  }

  async function toggleActive(deal: Deal) {
    await fetch(`/api/admin/deals/${deal.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isActive: !deal.isActive }),
    });
    await load();
  }

  if (error && !deals) return <ErrorState message="Could not load deals." onRetry={load} />;
  if (!deals) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="animate-spin text-gray-300" size={28} />
      </div>
    );
  }

  return (
    <div className="px-4 py-4">
      <div className="mb-4 flex gap-2">
        <button
          type="button"
          onClick={() => setForm(EMPTY_FORM)}
          className="flex h-11 flex-1 items-center justify-center gap-2 rounded-2xl bg-brand-600 text-sm font-bold text-white"
        >
          <Plus size={18} /> Add Deal
        </button>
        <Link
          href="/admin/coupons"
          className="flex h-11 items-center justify-center gap-2 rounded-2xl border border-gray-200 bg-white px-4 text-sm font-semibold text-gray-700"
        >
          <Ticket size={16} /> Coupons
        </Link>
      </div>

      {deals.length === 0 ? (
        <EmptyState icon={<TagIcon size={40} />} title="No deals yet" message="Create your first promotional deal." />
      ) : (
        <div className="space-y-2.5">
          {deals.map((deal) => (
            <div key={deal.id} className="rounded-2xl border border-gray-100 bg-white p-3.5">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-gray-900">{deal.title}</p>
                  <p className="text-xs text-gray-500">
                    {deal.discountType === 'PERCENTAGE'
                      ? `${parseFloat(deal.discountValue)}% off`
                      : `${formatCurrency(deal.discountValue, 'PKR')} off`}
                    {deal.minOrderAmount && ` · Min ${formatCurrency(deal.minOrderAmount, 'PKR')}`}
                  </p>
                  <p className="text-xs text-gray-400">
                    {toDateInputValue(deal.startDate)} → {toDateInputValue(deal.endDate)}
                  </p>
                </div>
                <label className="flex shrink-0 items-center gap-1.5 text-xs">
                  <input
                    type="checkbox"
                    checked={deal.isActive}
                    onChange={() => toggleActive(deal)}
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
                      id: deal.id,
                      title: deal.title,
                      description: deal.description ?? '',
                      imageUrl: deal.imageUrl ?? '',
                      discountType: deal.discountType,
                      discountValue: deal.discountValue,
                      minOrderAmount: deal.minOrderAmount ?? '',
                      startDate: toDateInputValue(deal.startDate),
                      endDate: toDateInputValue(deal.endDate),
                      isActive: deal.isActive,
                    })
                  }
                  className="flex h-9 flex-1 items-center justify-center gap-1.5 rounded-lg border border-gray-200 text-xs font-semibold text-gray-700"
                >
                  <Pencil size={13} /> Edit
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(deal)}
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
              {form.id ? 'Edit Deal' : 'Add Deal'}
            </h2>
            <div className="space-y-3">
              <label className="block">
                <span className="mb-1.5 block text-sm font-medium text-gray-700">Title</span>
                <input
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  className="input"
                  placeholder="e.g. Weekend Biryani Deal"
                />
              </label>
              <label className="block">
                <span className="mb-1.5 block text-sm font-medium text-gray-700">Description</span>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  rows={2}
                  className="input resize-none"
                />
              </label>
              <ImageUploadField
                value={form.imageUrl}
                onChange={(url) => setForm({ ...form, imageUrl: url })}
                folder="deals"
              />
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
              <label className="block">
                <span className="mb-1.5 block text-sm font-medium text-gray-700">
                  Minimum Order Amount
                </span>
                <input
                  type="number"
                  min="0"
                  value={form.minOrderAmount}
                  onChange={(e) => setForm({ ...form, minOrderAmount: e.target.value })}
                  className="input"
                  placeholder="Optional"
                />
              </label>
              <div className="grid grid-cols-2 gap-3">
                <label className="block">
                  <span className="mb-1.5 block text-sm font-medium text-gray-700">Start Date</span>
                  <input
                    type="date"
                    value={form.startDate}
                    onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                    className="input"
                  />
                </label>
                <label className="block">
                  <span className="mb-1.5 block text-sm font-medium text-gray-700">End Date</span>
                  <input
                    type="date"
                    value={form.endDate}
                    onChange={(e) => setForm({ ...form, endDate: e.target.value })}
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
                disabled={isSaving || !form.title.trim() || !form.discountValue}
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
