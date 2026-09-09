import { db } from '@/lib/db';
import { serializeProduct } from '@/lib/queries';
import { ProductCard } from '@/components/customer/ProductCard';
import { MenuSearch } from '@/components/customer/MenuSearch';
import { EmptyState } from '@/components/shared/EmptyState';
import { UtensilsCrossed } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function MenuPage() {
  const categories = await db.category.findMany({
    where: { isActive: true, products: { some: { isAvailable: true } } },
    orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    include: {
      products: {
        where: { isAvailable: true },
        orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
        include: { category: { select: { name: true, slug: true } } },
      },
    },
  });

  const hasAnyProducts = categories.some((c) => c.products.length > 0);

  return (
    <MenuSearch>
      {!hasAnyProducts ? (
        <div className="px-4">
          <EmptyState
            icon={<UtensilsCrossed size={40} />}
            title="Menu is empty"
            message="No dishes are available right now. Please check back soon."
          />
        </div>
      ) : (
        <div className="px-4 py-4">
          {/* Jump-to-category chips */}
          <div className="mb-4 flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {categories.map((category) => (
              <a
                key={category.id}
                href={`#${category.slug}`}
                className="shrink-0 rounded-full border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700"
              >
                {category.name}
              </a>
            ))}
          </div>

          {categories.map((category) => (
            <section key={category.id} id={category.slug} className="mb-7 scroll-mt-32">
              <h2 className="mb-3 text-base font-bold text-gray-900">{category.name}</h2>
              <div className="grid grid-cols-2 gap-3">
                {category.products.map((product: any) => (
                  <ProductCard key={product.id} product={serializeProduct(product)} />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </MenuSearch>
  );
}
