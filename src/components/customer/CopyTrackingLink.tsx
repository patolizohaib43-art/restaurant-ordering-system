'use client';

import { useState } from 'react';
import { Copy, Check } from 'lucide-react';

export function CopyTrackingLink({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // Clipboard API unavailable — the link is still visible and selectable
    }
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      className="flex h-11 items-center gap-2 rounded-xl border border-gray-200 px-4 text-sm font-medium text-gray-700 active:bg-gray-50"
    >
      {copied ? <Check size={16} className="text-green-600" /> : <Copy size={16} />}
      {copied ? 'Copied!' : 'Copy tracking link'}
    </button>
  );
}
