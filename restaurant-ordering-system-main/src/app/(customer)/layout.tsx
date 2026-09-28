import { Footer } from '@/components/shared/Footer';
import { CartProvider } from '@/components/customer/CartProvider';
import { SettingsProvider } from '@/components/customer/SettingsProvider';
import { TopBar } from '@/components/customer/TopBar';
import { BottomNav } from '@/components/customer/BottomNav';
import { StickyCart } from '@/components/customer/StickyCart';
import { getPublicSettings } from '@/lib/settings';

// This layout wraps every (customer) page and loads live restaurant
// settings from the database on every render. That means none of its
// child routes can be statically prerendered at build time (the
// database isn't reachable during the Vercel build step, and this data
// — opening hours, "accepting orders" toggle — must always be fresh
// anyway). Setting it here at the route-group root covers every child
// page in one place, including client-component pages like cart/,
// track/, and review/[token]/ that can't export their own `dynamic`
// config.
export const dynamic = 'force-dynamic';

export default async function CustomerLayout({ children }: { children: React.ReactNode }) {
  const settings = await getPublicSettings();

  return (
    <CartProvider>
      <SettingsProvider settings={settings}>
        <div className="flex min-h-screen flex-col">
          <TopBar />
          {/* Extra bottom padding accounts for the sticky cart bar that can
              appear above the bottom nav on any of these pages. */}
          <main className="flex-1 pb-36">{children}</main>
          <Footer variant="customer" />
          <StickyCart />
          <BottomNav />
        </div>
      </SettingsProvider>
    </CartProvider>
  );
}
