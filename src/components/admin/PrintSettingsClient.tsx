'use client';

import { useEffect, useState, useCallback } from 'react';
import { Loader2, Printer, Volume2, Zap, Check, Store } from 'lucide-react';
import { ErrorState } from '@/components/shared/ErrorState';
import { ImageUploadField } from '@/components/admin/ImageUploadField';

interface OperationalSettings {
  restaurantName: string;
  tagline: string;
  logoUrl: string | null;
  address: string | null;
  phone: string | null;
  currency: string;
  receiptWidth: 'MM_58' | 'MM_80';
  autoPrintNewOrders: boolean;
  notificationSoundEnabled: boolean;
}

const WIDTH_OPTIONS: { value: 'MM_58' | 'MM_80'; label: string; hint: string }[] = [
  { value: 'MM_58', label: '58mm', hint: 'Compact thermal printers' },
  { value: 'MM_80', label: '80mm', hint: 'Standard thermal printers' },
];

export function PrintSettingsClient() {
  const [settings, setSettings] = useState<OperationalSettings | null>(null);
  const [error, setError] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/settings', { cache: 'no-store' });
      const json = await res.json();
      if (!json.success) throw new Error();
      setSettings(json.data);
      setError(false);
    } catch {
      setError(true);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function save(patch: Partial<OperationalSettings>) {
    if (!settings) return;
    const next = { ...settings, ...patch };
    setSettings(next); // optimistic
    setIsSaving(true);
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch),
      });
      const json = await res.json();
      if (json.success) {
        setSettings(json.data);
        setSavedAt(Date.now());
      } else {
        await load(); // revert to server truth on failure
      }
    } catch {
      await load();
    } finally {
      setIsSaving(false);
    }
  }

  if (error && !settings) {
    return <ErrorState message="Could not load settings." onRetry={load} />;
  }
  if (!settings) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="animate-spin text-gray-300" size={28} />
      </div>
    );
  }

  return (
    <div className="px-4 py-4">
      {/* Restaurant profile / branding */}
      <RestaurantProfileSection settings={settings} onSave={save} />

      {/* Receipt width */}
      <section className="rounded-2xl border border-gray-100 bg-white p-4">
        <div className="mb-3 flex items-center gap-2">
          <Printer size={16} className="text-gray-500" />
          <h2 className="text-sm font-semibold text-gray-900">Receipt Width</h2>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {WIDTH_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => save({ receiptWidth: opt.value })}
              className={`rounded-xl border p-3 text-left ${
                settings.receiptWidth === opt.value
                  ? 'border-brand-500 bg-brand-50'
                  : 'border-gray-200 bg-white'
              }`}
            >
              <p className="text-sm font-bold text-gray-900">{opt.label}</p>
              <p className="text-xs text-gray-500">{opt.hint}</p>
            </button>
          ))}
        </div>
        <p className="mt-3 text-xs text-gray-400">
          Restaurant name, phone, and address on the receipt come automatically from Restaurant
          Settings.
        </p>
      </section>

      {/* Auto print */}
      <section className="mt-4 rounded-2xl border border-gray-100 bg-white p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Zap size={16} className="text-gray-500" />
            <div>
              <p className="text-sm font-semibold text-gray-900">Auto Print New Orders</p>
              <p className="text-xs text-gray-500">
                Attempts to open the print dialog automatically for new orders.
              </p>
            </div>
          </div>
          <Toggle
            checked={settings.autoPrintNewOrders}
            onChange={(v) => save({ autoPrintNewOrders: v })}
          />
        </div>
        <p className="mt-3 rounded-lg bg-amber-50 p-2.5 text-xs text-amber-800">
          Browsers can block a print dialog that isn&apos;t triggered by a direct click, and no
          mobile browser can silently print straight to a Bluetooth/USB thermal printer on its
          own. If that happens, a &quot;Print Receipt&quot; button still appears on every order so
          you can print with one tap. Fully silent, unattended printing needs a local print
          bridge/native app connected to your specific printer — that is a separate integration,
          not something enabling this toggle fakes.
        </p>
      </section>

      {/* Notification sound */}
      <section className="mt-4 rounded-2xl border border-gray-100 bg-white p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Volume2 size={16} className="text-gray-500" />
            <div>
              <p className="text-sm font-semibold text-gray-900">New Order Sound</p>
              <p className="text-xs text-gray-500">Play a short sound when a new order arrives.</p>
            </div>
          </div>
          <Toggle
            checked={settings.notificationSoundEnabled}
            onChange={(v) => save({ notificationSoundEnabled: v })}
          />
        </div>
      </section>

      <div className="mt-4 flex h-8 items-center justify-center gap-1.5 text-xs text-gray-400">
        {isSaving && (
          <>
            <Loader2 size={12} className="animate-spin" /> Saving…
          </>
        )}
        {!isSaving && savedAt && (
          <>
            <Check size={12} className="text-green-500" /> Saved
          </>
        )}
      </div>
    </div>
  );
}

function RestaurantProfileSection({
  settings,
  onSave,
}: {
  settings: OperationalSettings;
  onSave: (patch: Partial<OperationalSettings>) => void;
}) {
  const [name, setName] = useState(settings.restaurantName);
  const [tagline, setTagline] = useState(settings.tagline);

  useEffect(() => setName(settings.restaurantName), [settings.restaurantName]);
  useEffect(() => setTagline(settings.tagline), [settings.tagline]);

  return (
    <section className="rounded-2xl border border-gray-100 bg-white p-4">
      <div className="mb-3 flex items-center gap-2">
        <Store size={16} className="text-brand-600" />
        <h2 className="text-sm font-semibold text-gray-900">Restaurant Profile</h2>
      </div>

      <label className="mb-1.5 block text-sm font-medium text-gray-700">Restaurant Name</label>
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        onBlur={() => name.trim() && name !== settings.restaurantName && onSave({ restaurantName: name.trim() })}
        className="input mb-3"
        placeholder="Zaiqa-e-Sindh"
      />

      <label className="mb-1.5 block text-sm font-medium text-gray-700">Tagline</label>
      <input
        value={tagline}
        onChange={(e) => setTagline(e.target.value)}
        onBlur={() => tagline !== settings.tagline && onSave({ tagline: tagline.trim() })}
        className="input mb-3"
        placeholder="Fast Food BBQ & Pizza"
      />

      <ImageUploadField
        value={settings.logoUrl ?? ''}
        onChange={(url) => onSave({ logoUrl: url })}
        folder="restaurant"
      />
      <p className="mt-1 text-[11px] text-gray-400">
        Shown in the header, hero section, and receipts.
      </p>
    </section>
  );
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`relative h-7 w-12 shrink-0 rounded-full transition-colors ${
        checked ? 'bg-brand-600' : 'bg-gray-300'
      }`}
    >
      <span
        className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-transform ${
          checked ? 'translate-x-6' : 'translate-x-1'
        }`}
      />
    </button>
  );
}
