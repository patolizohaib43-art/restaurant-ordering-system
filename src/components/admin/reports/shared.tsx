'use client';

import { Download, Loader2 } from 'lucide-react';
import { useState } from 'react';

export function StatCard({
  label,
  value,
  sub,
}: {
  label: string;
  value: string | number;
  sub?: string;
}) {
  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-4">
      <p className="text-xs font-medium text-gray-400">{label}</p>
      <p className="mt-1.5 text-lg font-bold text-gray-900">{value}</p>
      {sub && <p className="mt-0.5 text-[11px] text-gray-400">{sub}</p>}
    </div>
  );
}

/**
 * Triggers a same-origin CSV download. Uses fetch (not a plain <a href>)
 * so the admin session cookie is sent and we can surface fetch errors
 * instead of silently navigating to a JSON error body.
 */
export function ExportButton({ url, filename }: { url: string; filename: string }) {
  const [isLoading, setIsLoading] = useState(false);
  const [failed, setFailed] = useState(false);

  async function handleExport() {
    setIsLoading(true);
    setFailed(false);
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error();
      const blob = await res.blob();
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch {
      setFailed(true);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleExport}
      disabled={isLoading}
      className="flex h-10 items-center gap-1.5 rounded-xl border border-gray-200 px-3.5 text-xs font-semibold text-gray-700 active:bg-gray-100 disabled:opacity-50"
    >
      {isLoading ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
      {failed ? 'Try again' : 'Export CSV'}
    </button>
  );
}
