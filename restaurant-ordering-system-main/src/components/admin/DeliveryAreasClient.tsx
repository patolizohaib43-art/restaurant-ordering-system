'use client';

import { useEffect, useState, useCallback } from 'react';
import { Plus, Pencil, Trash2, Loader2, MapPinned } from 'lucide-react';
import { EmptyState } from '@/components/shared/EmptyState';
import { ErrorState } from '@/components/shared/ErrorState';
import { formatCurrency } from '@/utils';

interface DeliveryArea {
  id: string;
  name: string;
  deliveryFee: string;
  minOrderAmount: string | null;
  isActive: boolean;
  sortOrder: number;
}

interface FormState {
  id: string | null;
  name: string;
  deliveryFee: string;
  minOrderAmount: string;
  isActive: boolean;
}

const EMPTY_FORM: FormState = { id: null, name: '', deliveryFee: '', minOrderAmount: '', isActive: true };

export function DeliveryAreasClient() {
  const [areas, setAreas] = useState<DeliveryArea[] | null>(null);
  const [error, setError] = useState(false);
  const [form, setForm] = useState<FormState | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/delivery-areas', { cache: 'no-store' });
      const json = await res.json();
      if (!json.success) throw new Error();
      setAreas(json.data);
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
        name: form.name.trim(),
        deliveryFee: parseFloat(form.deliveryFee),
        minOrderAmount: form.minOrderAmount ? parseFloat(form.minOrderAmount) : null,
        isActive: form.isActive,
      };
      const res = await fetch(
        form.id ? `/api/admin/delivery-areas/${form.id}` : '/api/admin/delivery-areas',
        {
          method: form.id ? 'PATCH' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        }
      );
      const json = await res.json();
      if (!res.ok || !json.success) {
        setSaveError(json.error ?? 'Could not save delivery area.');
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

  async function handleDelete(area: DeliveryArea) {
    if (!confirm(`Delete "${area.name}"? Past orders that used this area are not affected.`)) return;
    await fetch(`/api/admin/delivery-areas/${area.id}`, { method: 'DELETE' });
    await load();
  }

  async function toggleActive(area: DeliveryArea) {
    await fetch(`/api/admin/delivery-areas/${area.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isActive: !area.isActive }),
    });
    await load();
  }

  if (error && !areas) return <ErrorState message="Could not load delivery areas." onRetry={load} />;
  if (!areas) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="animate-spin text-gray-300" size={28} />
      </div>
    );
  }

  return (
    <div className="px-4 py-4">
      <p className="mb-3 text-xs text-gray-400">
        Add areas to charge a different delivery fee per neighborhood. Customers pick one at
        checkout, and the fee is always re-verified on the server. If no areas are active here,
        checkout falls back to the single delivery charge set in Settings → Delivery.
      </p>

      <button
        type="button"
        onClick={() => setForm(EMPTY_FORM)}
        className="mb-4 flex h-11 w-full items-center justify-center gap-2 rounded-2xl bg-brand-600 text-sm font-bold text-white"
      >
        <Plus size={18} /> Add Delivery Area
      </button>

      {areas.length === 0 ? (
        <EmptyState
          icon={<MapPinned size={40} />}
          title="No delivery areas yet"
          message="Using the single flat delivery charge from Settings for now."
        />
      ) : (
        <div className="space-y-2.5">
          {areas.map((area) => (
            <div key={area.id} className="rounded-2xl border border-gray-100 bg-white p-3.5">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-gray-900">{area.name}</p>
                  <p className="text-xs text-gray-500">
                    Delivery: {formatCurrency(area.deliveryFee, 'PKR')}
                    {area.minOrderAmount && ` · Min order ${formatCurrency(area.minOrderAmount, 'PKR')}`}
                  </p>
                </div>
                <label className="flex shrink-0 items-center gap-1.5 text-xs">
                  <input
                    type="checkbox"
                    checked={area.isActive}
                    onChange={() => toggleActive(area)}
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
                      id: area.id,
                      name: area.name,
                      deliveryFee: area.deliveryFee,
                      minOrderAmount: area.minOrderAmount ?? '',
                      isActive: area.isActive,
                    })
                  }
                  className="flex h-9 flex-1 items-center justify-center gap-1.5 rounded-lg border border-gray-200 text-xs font-semibold text-gray-700"
                >
                  <Pencil size={13} /> Edit
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(area)}
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
              {form.id ? 'Edit Delivery Area' : 'Add Delivery Area'}
            </h2>
            <div className="space-y-3">
              <label className="block">
                <span className="mb-1.5 block text-sm font-medium text-gray-700">Area Name</span>
                <input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="input"
                  placeholder="e.g. Tando Bago"
                />
              </label>
              <label className="block">
                <span className="mb-1.5 block text-sm font-medium text-gray-700">
                  Delivery Charge (PKR)
                </span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.deliveryFee}
                  onChange={(e) => setForm({ ...form, deliveryFee: e.target.value })}
                  className="input"
                />
              </label>
              <label className="block">
                <span className="mb-1.5 block text-sm font-medium text-gray-700">
                  Minimum Order (optional)
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
              <label className="flex items-center gap-2 text-sm text-gray-700">
                <input
                  type="checkbox"
                  checked={form.isActive}
                  onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
                  className="h-4 w-4"
                />
                Active (visible to customers at checkout)
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
                disabled={isSaving || !form.name.trim() || form.deliveryFee === ''}
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
