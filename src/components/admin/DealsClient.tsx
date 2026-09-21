'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { Plus, Pencil, Trash2, Loader2, Tag as TagIcon, Ticket, X, Package } from 'lucide-react';
import { EmptyState } from '@/components/shared/EmptyState';
import { ErrorState } from '@/components/shared/ErrorState';
import { ImageUploadField } from '@/components/admin/ImageUploadField';
import { formatCurrency } from '@/utils';

interface DealItemView {
  productId: string;
  productName: string;
  quantity: number;
}

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
  bundlePrice: string | null;
  dealItems: DealItemView[];
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
  bundlePrice: string;
  dealItems: DealItemView[];
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
  bundlePrice: '',
  dealItems: [],
};

export function DealsClient() {
  const [deals, setDeals] = useState<Deal[] | null>(null);
  const [error, setError] = useState(false);
  const [form, setForm] = useState<FormState | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [products, setProducts] = useState<{ id: string; name: string }[]>([]);
  const [pickerProductId, setPickerProductId] = useState('');
  const [pickerQuantity, setPickerQuantity] = useState('1');

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

  // Bundle-item picker needs the product list — only fetched once the
  // add/edit form is actually opened, not on every page load.
  useEffect(() => {
    if (!form || products.length > 0) return;
    fetch('/api/admin/products', { cache: 'no-store' })
      .then((res) => res.json())
      .then((json) => {
        if (json.success) setProducts(json.data.map((p: { id: string; name: string }) => ({ id: p.id, name: p.name })));
      })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form]);

  function addBundleItem() {
    if (!form || !pickerProductId) return;
    const product = products.find((p) => p.id === pickerProductId);
    if (!product) return;
    const quantity = Math.max(1, parseInt(pickerQuantity, 10) || 1);
    const existing = form.dealItems.find((di) => di.productId === pickerProductId);
    const dealItems = existing
      ? form.dealItems.map((di) =>
          di.productId === pickerProductId ? { ...di, quantity: di.quantity + quantity } : di
        )
      : [...form.dealItems, { productId: product.id, productName: product.name, quantity }];
    setForm({ ...form, dealItems });
    setPickerProductId('');
    setPickerQuantity('1');
  }

  function removeBundleItem(productId: string) {
    if (!form) return;
    setForm({ ...form, dealItems: form.dealItems.filter((di) => di.productId !== productId) });
  }

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
        bundlePrice: form.bundlePrice ? parseFloat(form.bundlePrice) : null,
        dealItems: form.dealItems.map((di) => ({ productId: di.productId, quantity: di.quantity })),
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
                  {deal.dealItems.length > 0 && (
                    <p className="mt-0.5 flex items-center gap-1 text-xs font-medium text-brand-700">
                      <Package size={12} />
                      Bundle: {deal.dealItems.map((di) => `${di.quantity}× ${di.productName}`).join(' + ')}
                      {deal.bundlePrice && ` — ${formatCurrency(deal.bundlePrice, 'PKR')}`}
                    </p>
                  )}
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
                      bundlePrice: deal.bundlePrice ?? '',
                      dealItems: deal.dealItems,
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

              <div className="rounded-xl border border-gray-100 bg-gray-50 p-3">
                <div className="mb-2 flex items-center gap-1.5">
                  <Package size={14} className="text-brand-600" />
                  <span className="text-sm font-medium text-gray-700">
                    Bundle items (optional)
                  </span>
                </div>
                <p className="mb-2 text-xs text-gray-500">
                  Add specific products to make this an orderable bundle (e.g. 1 Zinger Burger + 1
                  Cold Drink). Leave empty to keep this as a plain promotional discount.
                </p>

                {form.dealItems.length > 0 && (
                  <div className="mb-2 space-y-1.5">
                    {form.dealItems.map((di) => (
                      <div
                        key={di.productId}
                        className="flex items-center justify-between rounded-lg bg-white px-2.5 py-2 text-xs"
                      >
                        <span>
                          {di.quantity}× {di.productName}
                        </span>
                        <button
                          type="button"
                          onClick={() => removeBundleItem(di.productId)}
                          className="text-red-500"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex gap-1.5">
                  <select
                    value={pickerProductId}
                    onChange={(e) => setPickerProductId(e.target.value)}
                    className="input flex-1 text-xs"
                  >
                    <option value="">Select a product...</option>
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                  <input
                    type="number"
                    min="1"
                    value={pickerQuantity}
                    onChange={(e) => setPickerQuantity(e.target.value)}
                    className="input w-14 text-xs"
                  />
                  <button
                    type="button"
                    onClick={addBundleItem}
                    disabled={!pickerProductId}
                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-600 text-white disabled:opacity-40"
                  >
                    <Plus size={16} />
                  </button>
                </div>

                {form.dealItems.length > 0 && (
                  <label className="mt-3 block">
                    <span className="mb-1.5 block text-sm font-medium text-gray-700">
                      Bundle Price (PKR)
                    </span>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={form.bundlePrice}
                      onChange={(e) => setForm({ ...form, bundlePrice: e.target.value })}
                      className="input"
                      placeholder="e.g. 850"
                    />
                  </label>
                )}
              </div>
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
                disabled={
                  isSaving ||
                  !form.title.trim() ||
                  !form.discountValue ||
                  (form.dealItems.length > 0 && !form.bundlePrice)
                }
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
