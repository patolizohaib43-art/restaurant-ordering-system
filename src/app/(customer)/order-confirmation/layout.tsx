import type { Metadata } from 'next';

// Order confirmation pages contain a customer's private order details and
// are reachable only via a high-entropy tracking token in the URL. They
// must never be indexed or cached by search engines.
export const metadata: Metadata = {
  robots: { index: false, follow: false, nocache: true },
};

export default function OrderConfirmationLayout({ children }: { children: React.ReactNode }) {
  return children;
}
