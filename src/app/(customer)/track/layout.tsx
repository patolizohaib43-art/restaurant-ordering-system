import type { Metadata } from 'next';

// The tracking page (and its per-order [token] subpage) shows a
// customer's private order status and details. It must never be
// indexed or cached by search engines.
export const metadata: Metadata = {
  robots: { index: false, follow: false, nocache: true },
};

export default function TrackLayout({ children }: { children: React.ReactNode }) {
  return children;
}
