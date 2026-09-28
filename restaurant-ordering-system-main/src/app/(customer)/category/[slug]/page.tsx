import { notFound } from 'next/navigation';
import { db } from '@/lib/db';
import { serializeProduct } from '@/lib/queries';
import { ProductCard } from '@/components/customer/ProductCard';
import { EmptyState } from '@/components/shared/EmptyState';
import { UtensilsCrossed } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function CategoryPage({ params }: { params: { slug: string } }) {
  const category = await db.category.findUnique({
    where: { slug: params.slug, isActive: true },
    include: {
      products: {
        where: { isAvailable: true },
        orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
        include: { category: { select: { name: true, slug: true } } },
      },
    },
  });

  if (!category) notFound();

  return (
    <div className="px-4 py-4">
      <h1 className="mb-1 text-lg font-bold text-gray-900">{category.name}</h1>
      {category.description && (
        <p className="mb-4 text-sm text-gray-500">{category.description}</p>
      )}

      {category.products.length === 0 ? (
        <EmptyState
          icon={<UtensilsCrossed size={40} />}
          title="No dishes here yet"
          message="Check back soon, or browse the full menu."
          actionHref="/menu"
          actionLabel="Browse full menu"
        />
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {category.products.map((product: any) => (
            <ProductCard key={product.id} product={serializeProduct(product)} />
          ))}
        </div>
      )}
    </div>
  );
}
