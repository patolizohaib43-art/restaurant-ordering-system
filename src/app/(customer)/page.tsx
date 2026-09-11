import Link from 'next/link';
import { Search } from 'lucide-react';
import { getPublicSettings } from '@/lib/settings';
import {
  getActiveCategories,
  getActiveDeals,
  getFeaturedProducts,
  getPopularProducts,
} from '@/lib/queries';
import { ProductCard } from '@/components/customer/ProductCard';
import { DealCard } from '@/components/customer/DealCard';
import { EmptyState } from '@/components/shared/EmptyState';

export const dynamic = 'force-dynamic';

export default async function CustomerHomePage() {
  const [settings, categories, deals, popular, featured] = await Promise.all([
    getPublicSettings(),
    getActiveCategories(),
    getActiveDeals(6),
    getPopularProducts(8),
    getFeaturedProducts(8),
  ]);

  return (
    <div className="pb-4">
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-brand-600 to-brand-800 px-4 pb-8 pt-6 text-white">
        <div className="flex items-center gap-3">
          {settings.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={settings.logoUrl}
              alt={settings.restaurantName}
              className="h-14 w-14 rounded-full border-2 border-white/40 object-cover"
            />
          ) : (
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-white/15 text-xl font-bold">
              {settings.restaurantName.charAt(0)}
            </div>
          )}
          <div>
            <h1 className="text-xl font-bold leading-tight">{settings.restaurantName}</h1>
            <span
              className={`mt-1 inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                settings.isOpenNow ? 'bg-green-400/20 text-green-100' : 'bg-red-400/20 text-red-100'
              }`}
            >
              {settings.isOpenNow ? '● Open now' : '● Closed right now'}
            </span>
          </div>
        </div>

        <p className="mt-4 max-w-xs text-sm font-medium tracking-wide text-accent-200">
          {settings.tagline || 'Authentic flavours, delivered fast.'}
        </p>

        <div className="mt-5 flex items-stretch gap-2">
          <Link
            href="/menu"
            className="flex h-12 flex-1 items-center gap-2.5 rounded-2xl bg-white/95 px-4 text-sm text-gray-500 shadow-lg"
          >
            <Search size={18} className="shrink-0" />
            <span className="truncate">Search for dishes...</span>
          </Link>
          <Link
            href="/menu"
            className="flex h-12 shrink-0 items-center rounded-2xl bg-accent-500 px-5 text-sm font-bold text-charcoal-900 shadow-lg active:bg-accent-600"
          >
            Order Now
          </Link>
        </div>
      </section>

      {/* Categories */}
      {categories.length > 0 && (
        <section className="mt-5">
          <SectionHeader title="Categories" />
          <div className="flex gap-3 overflow-x-auto px-4 pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {categories.map((category) => (
              <Link
                key={category.id}
                href={`/category/${category.slug}`}
                className="flex w-20 shrink-0 flex-col items-center gap-1.5"
              >
                <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-2xl bg-gray-100 text-2xl">
                  {category.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={category.imageUrl}
                      alt={category.name}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    '🍛'
                  )}
                </div>
                <span className="line-clamp-1 text-center text-xs font-medium text-gray-700">
                  {category.name}
                </span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Deals */}
      {deals.length > 0 && (
        <section className="mt-6">
          <SectionHeader title="Deals for you" href="/deals" />
          <div className="flex gap-3 overflow-x-auto px-4 pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {deals.map((deal) => (
              <DealCard key={deal.id} deal={deal} currency={settings.currency} />
            ))}
          </div>
        </section>
      )}

      {/* Popular */}
      {popular.length > 0 && (
        <section className="mt-6">
          <SectionHeader title="Popular right now" href="/menu" />
          <div className="grid grid-cols-2 gap-3 px-4">
            {popular.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </section>
      )}

      {/* Featured */}
      {featured.length > 0 && (
        <section className="mt-6">
          <SectionHeader title="Featured" href="/menu" />
          <div className="grid grid-cols-2 gap-3 px-4">
            {featured.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </section>
      )}

      {categories.length === 0 && popular.length === 0 && featured.length === 0 && (
        <div className="px-4">
          <EmptyState
            title="Menu coming soon"
            message="We're setting up the menu. Please check back shortly."
          />
        </div>
      )}

      {/* Restaurant information */}
      {(settings.address || settings.phone || settings.whatsapp) && (
        <section className="mt-6 px-4">
          <SectionHeader title="Visit or contact us" />
          <div className="space-y-2.5 rounded-2xl border border-gray-100 bg-white p-4">
            {settings.address && (
              <div>
                <p className="text-xs font-medium text-gray-400">Address</p>
                <p className="text-sm text-gray-800">
                  {settings.address}
                  {settings.city ? `, ${settings.city}` : ''}
                </p>
                {settings.googleMapsUrl && (
                  <a
                    href={settings.googleMapsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-0.5 inline-block text-xs font-semibold text-brand-600"
                  >
                    Get directions →
                  </a>
                )}
              </div>
            )}
            {settings.phone && (
              <div>
                <p className="text-xs font-medium text-gray-400">Phone</p>
                <a href={`tel:${settings.phone}`} className="text-sm text-gray-800">
                  {settings.phone}
                </a>
              </div>
            )}
            {settings.whatsapp && (
              <div>
                <p className="text-xs font-medium text-gray-400">WhatsApp</p>
                <a
                  href={`https://wa.me/${settings.whatsapp.replace(/[^0-9]/g, '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-gray-800"
                >
                  {settings.whatsapp}
                </a>
              </div>
            )}
          </div>
        </section>
      )}
    </div>
  );
}

function SectionHeader({ title, href }: { title: string; href?: string }) {
  return (
    <div className="mb-3 flex items-center justify-between px-4">
      <h2 className="text-base font-bold text-gray-900">{title}</h2>
      {href && (
        <Link href={href} className="text-xs font-semibold text-brand-600">
          See all
        </Link>
      )}
    </div>
  );
}
