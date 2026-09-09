import type { Metadata, Viewport } from 'next';
import './globals.css';
import { getPublicSettings } from '@/lib/settings';
import { ServiceWorkerRegistration } from '@/components/shared/ServiceWorkerRegistration';
import { OfflineBanner } from '@/components/shared/OfflineBanner';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';

// The root layout's generateMetadata() below reads live restaurant
// settings from the database. Any auto-generated route that has no page
// of its own to control this (e.g. Next.js's built-in /_not-found)
// still renders through this root layout, so without this flag Next.js
// tries to prerender them at build time — when the database isn't
// reachable — and the build fails. Forcing dynamic here, app-wide,
// guarantees nothing under this layout is ever prerendered at build
// time, regardless of whether an individual page remembers to set its
// own `dynamic` export.
export const dynamic = 'force-dynamic';

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getPublicSettings();
  const title = settings.restaurantName || 'Zaiqa-e-Sindh';
  const description = `${title} — Fast Food BBQ & Pizza. Order online — fast, simple, no account required.`;

  return {
    metadataBase: new URL(APP_URL),
    title: {
      default: title,
      template: `%s | ${title}`,
    },
    description,
    applicationName: title,
    manifest: '/manifest.json',
    icons: {
      icon: [{ url: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' }],
      apple: [{ url: '/icons/apple-touch-icon.png', sizes: '180x180', type: 'image/png' }],
    },
    openGraph: {
      title,
      description,
      url: APP_URL,
      siteName: title,
      images: settings.logoUrl ? [{ url: settings.logoUrl }] : undefined,
      locale: 'en_US',
      type: 'website',
    },
    twitter: {
      card: 'summary',
      title,
      description,
    },
    robots: {
      // Customer site is public and should be indexed; admin overrides
      // this in its own layout metadata.
      index: true,
      follow: true,
    },
  };
}

export const viewport: Viewport = {
  themeColor: '#d21f1f',
  width: 'device-width',
  initialScale: 1,
  // Prevents pinch-zoom from fighting the fixed bottom nav/sticky cart on
  // small Android phones while still allowing accessibility zoom via OS.
  maximumScale: 5,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-gray-50 font-sans text-gray-900 antialiased">
        <OfflineBanner />
        {children}
        <ServiceWorkerRegistration />
      </body>
    </html>
  );
}
