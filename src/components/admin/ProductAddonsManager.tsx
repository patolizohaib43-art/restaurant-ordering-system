'use client';

import { useEffect, useState, useCallback } from 'react';
import { Plus, Trash2, Loader2 } from 'lucide-react';

interface Addon {
  id: string;
  name: string;
  price: string;
  isAvailable: boolean;
  maxQuantity: number;
}

export function ProductAddonsManager({ productId }: { productId: string }) {
  const [addons, setAddons] = useState<Addon[] | null>(null);
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await fetch(`/api/admin/products/${productId}/addons`, { cache: 'no-store' });
    const json = await res.json();
    if (json.success) setAddons(json.data);
  }, [productId]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleAdd() {
    if (!name.trim() || price === '') return;
    setIsAdding(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/products/${productId}/addons`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), price: parseFloat(price) }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        setError(json.error ?? 'Could not add add-on.');
        return;
      }
      setName('');
      setPrice('');
      await load();
    } finally {
      setIsAdding(false);
    }
  }

  async function toggleAvailable(addon: Addon) {
    await fetch(`/api/admin/addons/${addon.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isAvailable: !addon.isAvailable }),
    });
    await load();
  }

  async function handleDelete(addon: Addon) {
    if (!confirm(`Remove add-on "${addon.name}"?`)) return;
    await fetch(`/api/admin/addons/${addon.id}`, { method: 'DELETE' });
    await load();
  }

  if (!addons) {
    return (
      <div className="flex h-24 items-center justify-center">
        <Loader2 className="animate-spin text-gray-300" size={20} />
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-4">
      <h2 className="mb-3 text-sm font-semibold text-gray-900">Add-ons</h2>

      {addons.length === 0 ? (
        <p className="mb-3 text-sm text-gray-400">
          No add-ons yet, e.g. Extra Cheese, Extra Patty, Extra Sauce.
        </p>
      ) : (
        <div className="mb-3 space-y-2">
          {addons.map((addon) => (
            <div
              key={addon.id}
              className="flex items-center justify-between rounded-xl border border-gray-100 px-3 py-2.5"
            >
              <div>
                <p className="text-sm font-medium text-gray-800">{addon.name}</p>
                <p className="text-xs text-gray-400">Rs. {addon.price}</p>
              </div>
              <div className="flex items-center gap-2">
                <label className="flex items-center gap-1.5 text-xs text-gray-500">
                  <input
                    type="checkbox"
                    checked={addon.isAvailable}
                    onChange={() => toggleAvailable(addon)}
                    className="h-4 w-4"
                  />
                  Available
                </label>
                <button
                  type="button"
                  onClick={() => handleDelete(addon)}
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-red-500"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="flex gap-2">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Add-on name"
          className="input flex-1"
        />
        <input
          type="number"
          min="0"
          step="0.01"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          placeholder="Price"
          className="input w-24"
        />
        <button
          type="button"
          onClick={handleAdd}
          disabled={isAdding || !name.trim() || price === ''}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gray-900 text-white disabled:opacity-40"
        >
          {isAdding ? <Loader2 size={16} className="animate-spin" /> : <Plus size={18} />}
        </button>
      </div>
      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
    </div>
  );
}
