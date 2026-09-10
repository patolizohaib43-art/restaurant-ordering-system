'use client';

import { useState } from 'react';
import { Upload, Loader2, ImageOff, X } from 'lucide-react';
import type { UploadFolder } from '@/lib/uploads';

export function ImageUploadField({
  value,
  onChange,
  folder = 'products',
}: {
  value: string;
  onChange: (url: string) => void;
  /** Which managed subfolder to store this image under (products,
   * categories, deals, restaurant). Keeps uploads organized on disk,
   * matching the VPS directory layout documented in the deploy guide. */
  folder?: UploadFolder;
}) {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowedTypes.includes(file.type)) {
      setUploadError('Please choose a JPG, PNG, WEBP, or GIF image.');
      e.target.value = '';
      return;
    }

    setIsUploading(true);
    setUploadError(null);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('folder', folder);
      const res = await fetch('/api/admin/upload', { method: 'POST', body: formData });
      const json = await res.json();
      if (!res.ok || !json.success) {
        setUploadError(json.error ?? 'Upload failed.');
        return;
      }
      onChange(json.data.url);
    } catch {
      setUploadError('Upload failed. Check your connection.');
    } finally {
      setIsUploading(false);
      e.target.value = '';
    }
  }

  return (
    <div>
      <span className="mb-1.5 block text-sm font-medium text-gray-700">Image</span>

      <div className="flex items-start gap-3">
        <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-xl bg-gray-100">
          {value ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={value} alt="Preview" className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-gray-300">
              <ImageOff size={24} />
            </div>
          )}
          {isUploading && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/40">
              <Loader2 size={20} className="animate-spin text-white" />
            </div>
          )}
        </div>

        <div className="flex flex-1 flex-col gap-2">
          <label className="flex h-11 cursor-pointer items-center justify-center gap-2 rounded-xl border border-gray-200 text-sm font-medium text-gray-700 active:bg-gray-50">
            <Upload size={16} />
            {value ? 'Replace image' : 'Upload from gallery'}
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              className="hidden"
              onChange={handleFileChange}
              disabled={isUploading}
            />
          </label>

          {value && (
            <button
              type="button"
              onClick={() => onChange('')}
              className="flex h-9 items-center justify-center gap-1.5 rounded-xl text-xs font-medium text-red-600"
            >
              <X size={14} />
              Remove image
            </button>
          )}

          <input
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder="or paste an image URL"
            className="input text-xs"
          />
        </div>
      </div>

      {uploadError && <p className="mt-1.5 text-xs text-red-600">{uploadError}</p>}
      <p className="mt-1.5 text-[11px] text-gray-400">
        Uploaded images are resized and compressed automatically. On the Vercel demo, uploaded
        files may not persist between deployments — paste an Image URL for anything permanent.
        On a VPS deployment, uploads persist normally.
      </p>
    </div>
  );
}
