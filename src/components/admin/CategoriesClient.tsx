'use client';

import { useEffect, useState, useCallback } from 'react';
import { Plus, Pencil, Trash2, ChevronUp, ChevronDown, Loader2, FolderOpen } from 'lucide-react';
import { EmptyState } from '@/components/shared/EmptyState';
import { ErrorState } from '@/components/shared/ErrorState';
import { slugify } from '@/utils';

interface Category {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  imageUrl: string | null;
  isActive: boolean;
  sortOrder: number;
  productCount: number;
}

interface FormState {
  id: string | null;
  name: string;
  description: string;
  imageUrl: string;
  isActive: boolean;
}

const EMPTY_FORM: FormState = { id: null, name: '', description: '', imageUrl: '', isActive: true };

export function CategoriesClient() {
  const [categories, setCategories] = useState<Category[] | null>(null);
  const [error, setError] = useState(false);
  const [form, setForm] = useState<FormState | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/categories', { cache: 'no-store' });
      const json = await res.json();
      if (!json.success) throw new Error();
      setCategories(json.data);
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
        description: form.description.trim() || undefined,
        imageUrl: form.imageUrl.trim() || undefined,
        isActive: form.isActive,
      };
      const res = await fetch(
        form.id ? `/api/admin/categories/${form.id}` : '/api/admin/categories',
        {
          method: form.id ? 'PATCH' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        }
      );
      const json = await res.json();
      if (!res.ok || !json.success) {
        setSaveError(json.error ?? 'Could not save category.');
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

  async function handleDelete(category: Category) {
    if (!confirm(`Delete "${category.name}"? This cannot be undone.`)) return;
    const res = await fetch(`/api/admin/categories/${category.id}`, { method: 'DELETE' });
    const json = await res.json();
    if (!res.ok || !json.success) {
      alert(json.error ?? 'Could not delete category.');
      return;
    }
    await load();
  }

  async function toggleActive(category: Category) {
    await fetch(`/api/admin/categories/${category.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isActive: !category.isActive }),
    });
    await load();
  }

  async function move(category: Category, direction: 'up' | 'down') {
    if (!categories) return;
    const sorted = [...categories].sort((a, b) => a.sortOrder - b.sortOrder);
    const index = sorted.findIndex((c) => c.id === category.id);
    const swapIndex = direction === 'up' ? index - 1 : index + 1;
    if (swapIndex < 0 || swapIndex >= sorted.length) return;

    const other = sorted[swapIndex];
    await Promise.all([
      fetch(`/api/admin/categories/${category.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sortOrder: other.sortOrder }),
      }),
      fetch(`/api/admin/categories/${other.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sortOrder: category.sortOrder }),
      }),
    ]);
    await load();
  }

  if (error && !categories) {
    return <ErrorState message="Could not load categories." onRetry={load} />;
  }
  if (!categories) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="animate-spin text-gray-300" size={28} />
      </div>
    );
  }

  const sorted = [...categories].sort((a, b) => a.sortOrder - b.sortOrder);

  return (
    <div className="px-4 py-4">
      <button
        type="button"
        onClick={() => setForm(EMPTY_FORM)}
        className="mb-4 flex h-11 w-full items-center justify-center gap-2 rounded-2xl bg-brand-600 text-sm font-bold text-white"
      >
        <Plus size={18} /> Add Category
      </button>

      {sorted.length === 0 ? (
        <EmptyState icon={<FolderOpen size={40} />} title="No categories yet" message="Add your first menu category." />
      ) : (
        <div className="space-y-2.5">
          {sorted.map((category, index) => (
            <div key={category.id} className="rounded-2xl border border-gray-100 bg-white p-3.5">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-gray-900">{category.name}</p>
                  <p className="text-xs text-gray-400">{category.productCount} products</p>
                </div>
                <label className="flex shrink-0 items-center gap-1.5 text-xs">
                  <input
                    type="checkbox"
                    checked={category.isActive}
                    onChange={() => toggleActive(category)}
                    className="h-4 w-4"
                  />
                  Active
                </label>
              </div>

              <div className="mt-2.5 flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => move(category, 'up')}
                  disabled={index === 0}
                  className="flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 text-gray-500 disabled:opacity-30"
                >
                  <ChevronUp size={16} />
                </button>
                <button
                  type="button"
                  onClick={() => move(category, 'down')}
                  disabled={index === sorted.length - 1}
                  className="flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 text-gray-500 disabled:opacity-30"
                >
                  <ChevronDown size={16} />
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setForm({
                      id: category.id,
                      name: category.name,
                      description: category.description ?? '',
                      imageUrl: category.imageUrl ?? '',
                      isActive: category.isActive,
                    })
                  }
                  className="flex h-9 flex-1 items-center justify-center gap-1.5 rounded-lg border border-gray-200 text-xs font-semibold text-gray-700"
                >
                  <Pencil size={13} /> Edit
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(category)}
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
            className="w-full rounded-t-3xl bg-white p-4 pb-8"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="mb-4 text-base font-bold text-gray-900">
              {form.id ? 'Edit Category' : 'Add Category'}
            </h2>
            <div className="space-y-3">
              <label className="block">
                <span className="mb-1.5 block text-sm font-medium text-gray-700">Name</span>
                <input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="input"
                  placeholder="e.g. Karahi"
                />
                {form.name && (
                  <span className="mt-1 block text-xs text-gray-400">
                    URL: /category/{slugify(form.name)}
                  </span>
                )}
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
              <label className="block">
                <span className="mb-1.5 block text-sm font-medium text-gray-700">Image URL</span>
                <input
                  value={form.imageUrl}
                  onChange={(e) => setForm({ ...form, imageUrl: e.target.value })}
                  className="input"
                  placeholder="https://..."
                />
              </label>
              <label className="flex items-center gap-2 text-sm text-gray-700">
                <input
                  type="checkbox"
                  checked={form.isActive}
                  onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
                  className="h-4 w-4"
                />
                Active (visible to customers)
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
                disabled={isSaving || !form.name.trim()}
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
