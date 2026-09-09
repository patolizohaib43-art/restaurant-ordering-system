import { notFound } from 'next/navigation';
import { db } from '@/lib/db';
import { ProductForm } from '@/components/admin/ProductForm';
import { ProductAddonsManager } from '@/components/admin/ProductAddonsManager';

export const dynamic = 'force-dynamic';

export default async function EditProductPage({ params }: { params: { id: string } }) {
  const product = await db.product.findUnique({ where: { id: params.id } });
  if (!product) notFound();

  return (
    <div>
      <ProductForm
        productId={product.id}
        initialValues={{
          categoryId: product.categoryId,
          name: product.name,
          description: product.description ?? '',
          price: product.price.toString(),
          discountPrice: product.discountPrice?.toString() ?? '',
          imageUrl: product.imageUrl ?? '',
          isAvailable: product.isAvailable,
          isFeatured: product.isFeatured,
          isPopular: product.isPopular,
          preparationTime: product.preparationTime?.toString() ?? '',
        }}
      />
      <div className="px-4 pb-10">
        <ProductAddonsManager productId={product.id} />
      </div>
    </div>
  );
}
