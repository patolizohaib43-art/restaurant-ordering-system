import type { Metadata } from 'next';

// The tracking page (and its per-order [token] subpage) shows a
// customer's private order status and details. It must never be
// indexed or cached by search engines.
export const metadata: Metadata = {
  robots: { index: false, follow: false, nocache: true },
};

// This page (and its parent CustomerLayout, which loads live restaurant
// settings from the database) must never be statically prerendered at
// build time — the database isn't reachable during the Vercel build
// step, and the settings/order status here need to be fresh on every
// request anyway. See the same pattern on menu/, deals/, product/, etc.
export const dynamic = 'force-dynamic';

export default function TrackLayout({ children }: { children: React.ReactNode }) {
  return children;
}
