import type { Metadata } from 'next';

// The review-submission page is only ever reached via a private
// per-order tracking token and should never be indexed.
export const metadata: Metadata = {
  robots: { index: false, follow: false, nocache: true },
};

export default function ReviewLayout({ children }: { children: React.ReactNode }) {
  return children;
}
