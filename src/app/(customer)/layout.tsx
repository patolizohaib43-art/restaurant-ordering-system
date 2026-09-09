import { Footer } from '@/components/shared/Footer';
import { CartProvider } from '@/components/customer/CartProvider';
import { SettingsProvider } from '@/components/customer/SettingsProvider';
import { TopBar } from '@/components/customer/TopBar';
import { BottomNav } from '@/components/customer/BottomNav';
import { StickyCart } from '@/components/customer/StickyCart';
import { getPublicSettings } from '@/lib/settings';

export const dynamic = 'force-dynamic';

export default async function CustomerLayout({ children }: { children: React.ReactNode }) {


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
