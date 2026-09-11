'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  Loader2,
  Printer,
  Volume2,
  Zap,
  Check,
  Store,
  Phone,
  Clock,
  Truck,
  Percent,
  Bell,
  MapPin,
} from 'lucide-react';
import { ErrorState } from '@/components/shared/ErrorState';
import { ImageUploadField } from '@/components/admin/ImageUploadField';

interface OpeningHoursDay {
  open: string;
  close: string;
  closed?: boolean;
}
type OpeningHours = Record<string, OpeningHoursDay>;

interface OperationalSettings {
  restaurantName: string;
  tagline: string;
  logoUrl: string | null;
  address: string | null;
  city: string | null;
  area: string | null;
  googleMapsUrl: string | null;
  phone: string | null;
  whatsapp: string | null;
  email: string | null;
  currency: string;
  timezone: string | null;
  receiptWidth: 'MM_58' | 'MM_80';
  autoPrintNewOrders: boolean;
  notificationSoundEnabled: boolean;
  deliveryEnabled: boolean;
  pickupEnabled: boolean;
  deliveryFee: string;
  freeDeliveryAboveAmount: string | null;
  minOrderAmount: string;
  taxPercentage: string;
  isAcceptingOrders: boolean;
  openingHours: OpeningHours | null;
}

const WIDTH_OPTIONS: { value: 'MM_58' | 'MM_80'; label: string; hint: string }[] = [
  { value: 'MM_58', label: '58mm', hint: 'Compact thermal printers' },
  { value: 'MM_80', label: '80mm', hint: 'Standard thermal printers' },
];

// Common Pakistani + a few international zones. `timezone` is a free IANA
// name in the database, so any valid zone works even if not listed here —
// this is just a convenient shortlist.
const TIMEZONE_OPTIONS = [
  'Asia/Karachi',
  'Asia/Kolkata',
  'Asia/Dubai',
  'Asia/Riyadh',
  'Europe/London',
  'America/New_York',
  'UTC',
];

const CURRENCY_OPTIONS = ['PKR', 'USD', 'INR', 'AED', 'SAR', 'GBP'];

const DAYS: { key: string; label: string }[] = [
  { key: 'mon', label: 'Mon' },
  { key: 'tue', label: 'Tue' },
  { key: 'wed', label: 'Wed' },
  { key: 'thu', label: 'Thu' },
  { key: 'fri', label: 'Fri' },
  { key: 'sat', label: 'Sat' },
  { key: 'sun', label: 'Sun' },
];

// Same shape as OperationalSettings for editing, except the numeric
// fields (stored/displayed as strings, matching Prisma Decimal
// serialization) can also be set from a plain number when saving — the
// number inputs below produce numbers, and the backend's Zod schema
// expects numbers for these fields too.
type SettingsPatch = Omit<
  Partial<OperationalSettings>,
  'deliveryFee' | 'minOrderAmount' | 'freeDeliveryAboveAmount' | 'taxPercentage'
> & {
  deliveryFee?: number;
  minOrderAmount?: number;
  freeDeliveryAboveAmount?: number | null;
  taxPercentage?: number;
};

const NUMERIC_KEYS = ['deliveryFee', 'minOrderAmount', 'freeDeliveryAboveAmount', 'taxPercentage'] as const;

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

  async function save(patch: SettingsPatch) {
    if (!settings) return;
    // Optimistic local update: OperationalSettings stores these 4 fields
    // as strings (matching what GET returns), so numbers from the patch
    // are stringified here — only for the in-memory preview, not for
    // what gets sent to the API below.
    const displayPatch: Partial<OperationalSettings> = { ...patch };
    for (const key of NUMERIC_KEYS) {
      const value = patch[key];
      if (value !== undefined) {
        (displayPatch as Record<string, unknown>)[key] = value === null ? null : value.toString();
      }
    }
    const next = { ...settings, ...displayPatch } as OperationalSettings;
    setSettings(next);
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
    <div className="px-4 py-4 pb-10">
      <RestaurantProfileSection settings={settings} onSave={save} />
      <ContactAddressSection settings={settings} onSave={save} />
      <BusinessSection settings={settings} onSave={save} />
      <DeliverySection settings={settings} onSave={save} />
      <TaxSection settings={settings} onSave={save} />
      <NotificationsSection settings={settings} onSave={save} />

      {/* Receipt width */}
      <section className="mt-4 rounded-2xl border border-gray-100 bg-white p-4">
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
          Restaurant name, phone, and address on the receipt come automatically from the sections
          above.
        </p>
      </section>

      {/* Auto print */}
      <section className="mt-4 rounded-2xl border border-gray-100 bg-white p-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Zap size={16} className="shrink-0 text-gray-500" />
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

type SectionProps = {
  settings: OperationalSettings;
  onSave: (patch: SettingsPatch) => void;
};

// ---------------- GENERAL: Restaurant profile ----------------
function RestaurantProfileSection({ settings, onSave }: SectionProps) {
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

// ---------------- GENERAL: Contact & address ----------------
function ContactAddressSection({ settings, onSave }: SectionProps) {
  const [phone, setPhone] = useState(settings.phone ?? '');
  const [whatsapp, setWhatsapp] = useState(settings.whatsapp ?? '');
  const [email, setEmail] = useState(settings.email ?? '');
  const [address, setAddress] = useState(settings.address ?? '');
  const [city, setCity] = useState(settings.city ?? '');
  const [mapsUrl, setMapsUrl] = useState(settings.googleMapsUrl ?? '');

  useEffect(() => setPhone(settings.phone ?? ''), [settings.phone]);
  useEffect(() => setWhatsapp(settings.whatsapp ?? ''), [settings.whatsapp]);
  useEffect(() => setEmail(settings.email ?? ''), [settings.email]);
  useEffect(() => setAddress(settings.address ?? ''), [settings.address]);
  useEffect(() => setCity(settings.city ?? ''), [settings.city]);
  useEffect(() => setMapsUrl(settings.googleMapsUrl ?? ''), [settings.googleMapsUrl]);

  return (
    <section className="mt-4 rounded-2xl border border-gray-100 bg-white p-4">
      <div className="mb-3 flex items-center gap-2">
        <Phone size={16} className="text-brand-600" />
        <h2 className="text-sm font-semibold text-gray-900">Contact &amp; Address</h2>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="mb-1.5 block text-sm font-medium text-gray-700">Phone</label>
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            onBlur={() => phone !== (settings.phone ?? '') && onSave({ phone: phone.trim() })}
            className="input"
            placeholder="0300 1234567"
            type="tel"
          />
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium text-gray-700">WhatsApp</label>
          <input
            value={whatsapp}
            onChange={(e) => setWhatsapp(e.target.value)}
            onBlur={() =>
              whatsapp !== (settings.whatsapp ?? '') && onSave({ whatsapp: whatsapp.trim() })
            }
            className="input"
            placeholder="0300 1234567"
            type="tel"
          />
        </div>
      </div>

      <label className="mb-1.5 mt-3 block text-sm font-medium text-gray-700">Email</label>
      <input
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        onBlur={() => email !== (settings.email ?? '') && onSave({ email: email.trim() })}
        className="input mb-3"
        placeholder="orders@zaiqaesindh.com"
        type="email"
      />

      <label className="mb-1.5 block text-sm font-medium text-gray-700">Complete Address</label>
      <textarea
        value={address}
        onChange={(e) => setAddress(e.target.value)}
        onBlur={() => address !== (settings.address ?? '') && onSave({ address: address.trim() })}
        className="input mb-3 resize-none"
        rows={2}
        placeholder="Shop #, street, landmark..."
      />

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="mb-1.5 block text-sm font-medium text-gray-700">City</label>
          <input
            value={city}
            onChange={(e) => setCity(e.target.value)}
            onBlur={() => city !== (settings.city ?? '') && onSave({ city: city.trim() })}
            className="input"
            placeholder="Hyderabad"
          />
        </div>
        <div>
          <label className="mb-1.5 flex items-center gap-1 text-sm font-medium text-gray-700">
            <MapPin size={13} /> Maps URL
          </label>
          <input
            value={mapsUrl}
            onChange={(e) => setMapsUrl(e.target.value)}
            onBlur={() =>
              mapsUrl !== (settings.googleMapsUrl ?? '') && onSave({ googleMapsUrl: mapsUrl.trim() })
            }
            className="input"
            placeholder="https://maps.app.goo.gl/..."
          />
        </div>
      </div>
    </section>
  );
}

// ---------------- BUSINESS: hours, timezone, currency, open/closed ----------------
function BusinessSection({ settings, onSave }: SectionProps) {
  // Simple model: one open/close time applied to every day of the week —
  // matches what the Settings screen asks for. The database can still
  // hold different hours per day (set programmatically or in a future
  // per-day editor); saving here overwrites all 7 days uniformly.
  const firstDay = settings.openingHours ? Object.values(settings.openingHours)[0] : undefined;
  const [openTime, setOpenTime] = useState(firstDay?.open ?? '11:00');
  const [closeTime, setCloseTime] = useState(firstDay?.close ?? '23:00');

  useEffect(() => {
    const d = settings.openingHours ? Object.values(settings.openingHours)[0] : undefined;
    if (d) {
      setOpenTime(d.open);
      setCloseTime(d.close);
    }
  }, [settings.openingHours]);

  function saveHours(open: string, close: string) {
    const hours: OpeningHours = {};
    for (const d of DAYS) hours[d.key] = { open, close };
    onSave({ openingHours: hours });
  }

  return (
    <section className="mt-4 rounded-2xl border border-gray-100 bg-white p-4">
      <div className="mb-3 flex items-center gap-2">
        <Clock size={16} className="text-brand-600" />
        <h2 className="text-sm font-semibold text-gray-900">Business</h2>
      </div>

      <div className="flex items-center justify-between rounded-xl bg-gray-50 px-3.5 py-3">
        <div>
          <p className="text-sm font-semibold text-gray-900">Accepting Orders</p>
          <p className="text-xs text-gray-500">
            Manual override — turn off to pause new orders immediately, regardless of hours below.
          </p>
        </div>
        <Toggle
          checked={settings.isAcceptingOrders}
          onChange={(v) => onSave({ isAcceptingOrders: v })}
        />
      </div>

      <div className="mt-3 grid grid-cols-2 gap-3">
        <div>
          <label className="mb-1.5 block text-sm font-medium text-gray-700">Opening Time</label>
          <input
            type="time"
            value={openTime}
            onChange={(e) => setOpenTime(e.target.value)}
            onBlur={() => saveHours(openTime, closeTime)}
            className="input"
          />
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium text-gray-700">Closing Time</label>
          <input
            type="time"
            value={closeTime}
            onChange={(e) => setCloseTime(e.target.value)}
            onBlur={() => saveHours(openTime, closeTime)}
            className="input"
          />
        </div>
      </div>
      <p className="mt-1.5 text-[11px] text-gray-400">
        Applies every day. Supports overnight hours (e.g. open 17:00, close 02:00).
      </p>

      <div className="mt-3 grid grid-cols-2 gap-3">
        <div>
          <label className="mb-1.5 block text-sm font-medium text-gray-700">Timezone</label>
          <select
            value={settings.timezone ?? 'Asia/Karachi'}
            onChange={(e) => onSave({ timezone: e.target.value })}
            className="input"
          >
            {TIMEZONE_OPTIONS.map((tz) => (
              <option key={tz} value={tz}>
                {tz}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium text-gray-700">Currency</label>
          <select
            value={settings.currency}
            onChange={(e) => onSave({ currency: e.target.value })}
            className="input"
          >
            {CURRENCY_OPTIONS.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
      </div>
      <p className="mt-1.5 text-[11px] text-gray-400">
        Timezone controls how order times, reports, and receipts display — not the device&apos;s
        own clock. Takes effect immediately, no redeploy needed.
      </p>
    </section>
  );
}

// ---------------- DELIVERY ----------------
function DeliverySection({ settings, onSave }: SectionProps) {
  const [fee, setFee] = useState(settings.deliveryFee);
  const [freeAbove, setFreeAbove] = useState(settings.freeDeliveryAboveAmount ?? '');
  const [minOrder, setMinOrder] = useState(settings.minOrderAmount);

  useEffect(() => setFee(settings.deliveryFee), [settings.deliveryFee]);
  useEffect(() => setFreeAbove(settings.freeDeliveryAboveAmount ?? ''), [settings.freeDeliveryAboveAmount]);
  useEffect(() => setMinOrder(settings.minOrderAmount), [settings.minOrderAmount]);

  return (
    <section className="mt-4 rounded-2xl border border-gray-100 bg-white p-4">
      <div className="mb-3 flex items-center gap-2">
        <Truck size={16} className="text-brand-600" />
        <h2 className="text-sm font-semibold text-gray-900">Delivery</h2>
      </div>

      <div className="space-y-2.5">
        <div className="flex items-center justify-between rounded-xl bg-gray-50 px-3.5 py-3">
          <p className="text-sm font-medium text-gray-900">Delivery Enabled</p>
          <Toggle checked={settings.deliveryEnabled} onChange={(v) => onSave({ deliveryEnabled: v })} />
        </div>
        <div className="flex items-center justify-between rounded-xl bg-gray-50 px-3.5 py-3">
          <p className="text-sm font-medium text-gray-900">Pickup Enabled</p>
          <Toggle checked={settings.pickupEnabled} onChange={(v) => onSave({ pickupEnabled: v })} />
        </div>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-3">
        <div>
          <label className="mb-1.5 block text-sm font-medium text-gray-700">
            Delivery Charge ({settings.currency})
          </label>
          <input
            type="number"
            inputMode="decimal"
            min={0}
            value={fee}
            onChange={(e) => setFee(e.target.value)}
            onBlur={() => {
              const n = Number(fee);
              if (!Number.isNaN(n) && fee !== settings.deliveryFee) onSave({ deliveryFee: n });
            }}
            className="input"
          />
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium text-gray-700">
            Min Order ({settings.currency})
          </label>
          <input
            type="number"
            inputMode="decimal"
            min={0}
            value={minOrder}
            onChange={(e) => setMinOrder(e.target.value)}
            onBlur={() => {
              const n = Number(minOrder);
              if (!Number.isNaN(n) && minOrder !== settings.minOrderAmount) onSave({ minOrderAmount: n });
            }}
            className="input"
          />
        </div>
      </div>

      <label className="mb-1.5 mt-3 block text-sm font-medium text-gray-700">
        Free Delivery Above ({settings.currency})
      </label>
      <input
        type="number"
        inputMode="decimal"
        min={0}
        value={freeAbove}
        onChange={(e) => setFreeAbove(e.target.value)}
        onBlur={() => {
          if (freeAbove.trim() === '') {
            if (settings.freeDeliveryAboveAmount !== null) onSave({ freeDeliveryAboveAmount: null });
            return;
          }
          const n = Number(freeAbove);
          if (!Number.isNaN(n) && freeAbove !== (settings.freeDeliveryAboveAmount ?? '')) {
            onSave({ freeDeliveryAboveAmount: n });
          }
        }}
        className="input"
        placeholder="Leave blank to disable"
      />
      <p className="mt-1.5 text-[11px] text-gray-400">
        Orders at or above this subtotal get free delivery automatically. Leave blank to always
        charge the delivery fee above.
      </p>
    </section>
  );
}

// ---------------- TAX ----------------
function TaxSection({ settings, onSave }: SectionProps) {
  const taxEnabled = Number(settings.taxPercentage) > 0;
  const [pct, setPct] = useState(settings.taxPercentage);
  const [lastNonZero, setLastNonZero] = useState(
    Number(settings.taxPercentage) > 0 ? settings.taxPercentage : '5'
  );

  useEffect(() => setPct(settings.taxPercentage), [settings.taxPercentage]);

  return (
    <section className="mt-4 rounded-2xl border border-gray-100 bg-white p-4">
      <div className="mb-3 flex items-center gap-2">
        <Percent size={16} className="text-brand-600" />
        <h2 className="text-sm font-semibold text-gray-900">Tax</h2>
      </div>

      <div className="flex items-center justify-between rounded-xl bg-gray-50 px-3.5 py-3">
        <p className="text-sm font-medium text-gray-900">Tax Enabled</p>
        <Toggle
          checked={taxEnabled}
          onChange={(v) => {
            if (v) {
              onSave({ taxPercentage: Number(lastNonZero) });
            } else {
              setLastNonZero(settings.taxPercentage);
              onSave({ taxPercentage: 0 });
            }
          }}
        />
      </div>

      {taxEnabled && (
        <>
          <label className="mb-1.5 mt-3 block text-sm font-medium text-gray-700">
            Tax Percentage (%)
          </label>
          <input
            type="number"
            inputMode="decimal"
            min={0}
            max={100}
            step={0.1}
            value={pct}
            onChange={(e) => setPct(e.target.value)}
            onBlur={() => {
              const n = Number(pct);
              if (!Number.isNaN(n) && pct !== settings.taxPercentage) onSave({ taxPercentage: n });
            }}
            className="input"
          />
        </>
      )}
      <p className="mt-1.5 text-[11px] text-gray-400">
        Applied to the subtotal after any discount, server-side, on every order and receipt.
      </p>
    </section>
  );
}

// ---------------- NOTIFICATIONS ----------------
function NotificationsSection({ settings, onSave }: SectionProps) {
  const [permission, setPermission] = useState<NotificationPermission | 'unsupported'>('default');

  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setPermission(Notification.permission);
    } else {
      setPermission('unsupported');
    }
  }, []);

  async function requestPermission() {
    if (typeof window === 'undefined' || !('Notification' in window)) return;
    const result = await Notification.requestPermission();
    setPermission(result);
  }

  return (
    <section className="mt-4 rounded-2xl border border-gray-100 bg-white p-4">
      <div className="mb-3 flex items-center gap-2">
        <Bell size={16} className="text-brand-600" />
        <h2 className="text-sm font-semibold text-gray-900">Notifications</h2>
      </div>

      <div className="flex items-center justify-between rounded-xl bg-gray-50 px-3.5 py-3">
        <div>
          <p className="text-sm font-medium text-gray-900">Browser Notifications</p>
          <p className="text-xs text-gray-500">
            {permission === 'granted' && 'Enabled on this device/browser.'}
            {permission === 'denied' && "Blocked — re-enable from your browser's site settings."}
            {permission === 'default' && 'Not yet requested on this device/browser.'}
            {permission === 'unsupported' && 'Not supported on this browser.'}
          </p>
        </div>
        {permission === 'default' && (
          <button
            type="button"
            onClick={requestPermission}
            className="h-9 shrink-0 rounded-xl bg-brand-600 px-3.5 text-xs font-semibold text-white"
          >
            Enable
          </button>
        )}
        {permission === 'granted' && <Check size={18} className="shrink-0 text-green-600" />}
      </div>

      <div className="mt-2.5 flex items-center justify-between rounded-xl bg-gray-50 px-3.5 py-3">
        <div className="flex items-center gap-2">
          <Volume2 size={16} className="shrink-0 text-gray-500" />
          <div>
            <p className="text-sm font-semibold text-gray-900">New Order Sound</p>
            <p className="text-xs text-gray-500">Play a short sound when a new order arrives.</p>
          </div>
        </div>
        <Toggle
          checked={settings.notificationSoundEnabled}
          onChange={(v) => onSave({ notificationSoundEnabled: v })}
        />
      </div>

      <p className="mt-3 rounded-lg bg-amber-50 p-2.5 text-xs text-amber-800">
        &quot;Push Notifications&quot; (alerts while the admin panel is fully closed) require a
        separate Web Push setup — service worker, VAPID keys, and a push subscription per device —
        which is not enabled here. Browser Notifications above work while this tab is open
        (foreground or background), and the in-app bell/badge always works regardless of
        permission. See README.md → Notifications for what a full Web Push setup would require.
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
