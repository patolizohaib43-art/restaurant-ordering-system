'use client';

import { useState } from 'react';
import { Upload, Loader2, ImageOff } from 'lucide-react';

export function ImageUploadField({
  value,
  onChange,
}: {
  value: string;
  onChange: (url: string) => void;
}) {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setUploadError(null);
    try {
      const formData = new FormData();
      formData.append('file', file);
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
      <div className="flex gap-2">
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="https://... (or upload a file)"
          className="input flex-1"
        />
        <label className="flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-xl border border-gray-200 text-gray-500">
          {isUploading ? (
            <Loader2 size={18} className="animate-spin" />
          ) : (
            <Upload size={18} />
          )}
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            className="hidden"
            onChange={handleFileChange}
            disabled={isUploading}
          />
        </label>
      </div>
      {uploadError && <p className="mt-1.5 text-xs text-red-600">{uploadError}</p>}
      <div className="mt-2 h-24 w-24 overflow-hidden rounded-xl bg-gray-100">
        {value ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={value} alt="Preview" className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-gray-300">
            <ImageOff size={24} />
          </div>
        )}
      </div>
      <p className="mt-1 text-[11px] text-gray-400">
        On a serverless demo (e.g. Vercel), uploaded files don&apos;t persist — paste an image URL
        instead. Uploads work permanently once deployed to a VPS.
      </p>
    </div>
  );
}
