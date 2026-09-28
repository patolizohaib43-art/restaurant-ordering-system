'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Trash2 } from 'lucide-react';
import { ImageUploadField } from '@/components/admin/ImageUploadField';

interface Category {
  id: string;
  name: string;
}

export interface ProductFormValues {
  categoryId: string;
  name: string;
  description: string;
  price: string;
  discountPrice: string;
  imageUrl: string;
  isAvailable: boolean;
  isFeatured: boolean;
  isPopular: boolean;
  preparationTime: string;
}

const EMPTY: ProductFormValues = {
  categoryId: '',
  name: '',
  description: '',
  price: '',
  discountPrice: '',
  imageUrl: '',
  isAvailable: true,
  isFeatured: false,
  isPopular: false,
  preparationTime: '',
};

export function ProductForm({
  productId,
  initialValues,
}: {
  productId?: string;
  initialValues?: ProductFormValues;
}) {
  const router = useRouter();
  const [categories, setCategories] = useState<Category[]>([]);
  const [values, setValues] = useState<ProductFormValues>(initialValues ?? EMPTY);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/admin/categories')
      .then((res) => res.json())
      .then((json) => {
        if (json.success) setCategories(json.data);
      });
  }, []);

  function update<K extends keyof ProductFormValues>(key: K, value: ProductFormValues[K]) {
    setValues((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const price = parseFloat(values.price);
    const discountPrice = values.discountPrice ? parseFloat(values.discountPrice) : null;

    if (!values.categoryId) return setError('Please select a category.');
    if (!values.name.trim()) return setError('Please enter a product name.');
    if (!price || price <= 0) return setError('Please enter a valid price.');
    if (discountPrice && discountPrice >= price) {
      return setError('Sale price must be lower than the regular price.');
    }

    setIsSaving(true);
    try {
      const payload = {
        categoryId: values.categoryId,
        name: values.name.trim(),
        description: values.description.trim() || undefined,
        price,
        discountPrice: discountPrice || null,
        imageUrl: values.imageUrl.trim() || undefined,
        isAvailable: values.isAvailable,
        isFeatured: values.isFeatured,
        isPopular: values.isPopular,
        preparationTime: values.preparationTime ? parseInt(values.preparationTime, 10) : null,
      };

      const res = await fetch(
        productId ? `/api/admin/products/${productId}` : '/api/admin/products',
        {
          method: productId ? 'PATCH' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        }
      );
      const json = await res.json();
      if (!res.ok || !json.success) {
        setError(json.error ?? 'Could not save product.');
        return;
      }

      router.push('/admin/products');
      router.refresh();
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete() {
    if (!productId) return;
    if (!confirm('Delete this product? This cannot be undone.')) return;
    setIsDeleting(true);
    const res = await fetch(`/api/admin/products/${productId}`, { method: 'DELETE' });
    const json = await res.json();
    if (!res.ok || !json.success) {
      alert(json.error ?? 'Could not delete product.');
      setIsDeleting(false);
      return;
    }
    router.push('/admin/products');
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 px-4 py-4 pb-10">
      <label className="block">
        <span className="mb-1.5 block text-sm font-medium text-gray-700">Category *</span>
        <select
          value={values.categoryId}
          onChange={(e) => update('categoryId', e.target.value)}
          className="input"
        >
          <option value="">Select a category</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </label>

      <label className="block">
        <span className="mb-1.5 block text-sm font-medium text-gray-700">Name *</span>
        <input
          value={values.name}
          onChange={(e) => update('name', e.target.value)}
          className="input"
          placeholder="e.g. Chicken Karahi (Half)"
        />
      </label>

      <label className="block">
        <span className="mb-1.5 block text-sm font-medium text-gray-700">Description</span>
        <textarea
          value={values.description}
          onChange={(e) => update('description', e.target.value)}
          rows={3}
          className="input resize-none"
        />
      </label>

      <div className="grid grid-cols-2 gap-3">
        <label className="block">
          <span className="mb-1.5 block text-sm font-medium text-gray-700">Price (PKR) *</span>
          <input
            type="number"
            min="0"
            step="0.01"
            value={values.price}
            onChange={(e) => update('price', e.target.value)}
            className="input"
          />
        </label>
        <label className="block">
          <span className="mb-1.5 block text-sm font-medium text-gray-700">Sale Price</span>
          <input
            type="number"
            min="0"
            step="0.01"
            value={values.discountPrice}
            onChange={(e) => update('discountPrice', e.target.value)}
            className="input"
            placeholder="Optional"
          />
        </label>
      </div>

      <label className="block">
        <span className="mb-1.5 block text-sm font-medium text-gray-700">
          Preparation Time (minutes)
        </span>
        <input
          type="number"
          min="0"
          value={values.preparationTime}
          onChange={(e) => update('preparationTime', e.target.value)}
          className="input"
          placeholder="Optional"
        />
      </label>

      <ImageUploadField
        value={values.imageUrl}
        onChange={(url) => update('imageUrl', url)}
        folder="products"
      />

      <div className="space-y-2.5 rounded-2xl border border-gray-100 bg-gray-50 p-3.5">
        <label className="flex items-center justify-between text-sm text-gray-700">
          In Stock (available to order)
          <input
            type="checkbox"
            checked={values.isAvailable}
            onChange={(e) => update('isAvailable', e.target.checked)}
            className="h-5 w-5"
          />
        </label>
        <label className="flex items-center justify-between text-sm text-gray-700">
          Featured on Home
          <input
            type="checkbox"
            checked={values.isFeatured}
            onChange={(e) => update('isFeatured', e.target.checked)}
            className="h-5 w-5"
          />
        </label>
        <label className="flex items-center justify-between text-sm text-gray-700">
          Pin to Popular section
          <input
            type="checkbox"
            checked={values.isPopular}
            onChange={(e) => update('isPopular', e.target.checked)}
            className="h-5 w-5"
          />
        </label>
      </div>

      {error && <p className="rounded-xl bg-red-50 px-3.5 py-2.5 text-sm text-red-700">{error}</p>}

      <button
        type="submit"
        disabled={isSaving}
        className="flex h-12 w-full items-center justify-center rounded-2xl bg-brand-600 text-sm font-bold text-white disabled:opacity-40"
      >
        {isSaving ? <Loader2 size={18} className="animate-spin" /> : productId ? 'Save Changes' : 'Create Product'}
      </button>

      {productId && (
        <button
          type="button"
          onClick={handleDelete}
          disabled={isDeleting}
          className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl border border-red-200 text-sm font-semibold text-red-600 disabled:opacity-40"
        >
          {isDeleting ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
          Delete Product
        </button>
      )}
    </form>
  );
}
