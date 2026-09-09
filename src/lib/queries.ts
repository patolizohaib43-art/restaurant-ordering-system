import { db } from '@/lib/db';
import type { Prisma } from '@prisma/client';

const productWithCategory = { category: { select: { name: true, slug: true } } } as const;

type ProductWithCategory = Prisma.ProductGetPayload<{ include: typeof productWithCategory }>;

export function serializeProduct(p: ProductWithCategory) {
  return {
    id: p.id,
    name: p.name,
    slug: p.slug,
    description: p.description,
    price: p.price.toString(),
    discountPrice: p.discountPrice?.toString() ?? null,
    imageUrl: p.imageUrl,
    isAvailable: p.isAvailable,
    isFeatured: p.isFeatured,
    isPopular: p.isPopular,
    preparationTime: p.preparationTime,
    category: p.category,
  };
}

export async function getActiveCategories() {
  const categories = await db.category.findMany({
    where: { isActive: true },
    orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    select: {
      id: true,
      name: true,
      slug: true,
      description: true,
      imageUrl: true,
      _count: { select: { products: { where: { isAvailable: true } } } },
    },
  });

  return categories.map((c) => ({
    id: c.id,
    name: c.name,
    slug: c.slug,
    description: c.description,
    imageUrl: c.imageUrl,
    productCount: c._count.products,
  }));
}

export async function getFeaturedProducts(limit = 10) {
  const products = await db.product.findMany({
    where: { isAvailable: true, isFeatured: true },
    include: productWithCategory,
    orderBy: { sortOrder: 'asc' },
    take: limit,
  });
  return products.map(serializeProduct);
}

export async function getPopularProducts(limit = 10) {
  const pinned = await db.product.findMany({
    where: { isAvailable: true, isPopular: true },
    include: productWithCategory,
    orderBy: { sortOrder: 'asc' },
    take: limit,
  });

  if (pinned.length >= limit) {
    return pinned.map(serializeProduct);
  }

  const remaining = limit - pinned.length;
  const pinnedIds = new Set(pinned.map((p) => p.id));

  const topSelling = await db.orderItem.groupBy({
    by: ['productId'],
    _sum: { quantity: true },
    where: { productId: { not: null } },
    orderBy: { _sum: { quantity: 'desc' } },
    take: remaining + pinned.length,
  });

  const ids = topSelling
    .map((t) => t.productId)
    .filter((id): id is string => !!id && !pinnedIds.has(id))
    .slice(0, remaining);

  if (ids.length === 0) {
    // No sales yet (new restaurant demo) — fall back to featured/newest
    const fallback = await db.product.findMany({
      where: { isAvailable: true, isPopular: false, id: { notIn: [...pinnedIds] } },
      include: productWithCategory,
      orderBy: [{ isFeatured: 'desc' }, { createdAt: 'desc' }],
      take: remaining,
    });
    return [...pinned, ...fallback].map(serializeProduct);
  }

  const found = await db.product.findMany({
    where: { id: { in: ids }, isAvailable: true },
    include: productWithCategory,
  });
  const order = new Map(ids.map((id, idx) => [id, idx]));
  const sorted = found.sort((a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0));
  return [...pinned, ...sorted].map(serializeProduct);
}

export async function getOrderByTrackingToken(token: string) {
  const order = await db.order.findUnique({
    where: { trackingToken: token },
    include: {
      items: { include: { addons: true } },
      statusHistory: { orderBy: { createdAt: 'asc' } },
      reviews: { select: { productId: true } },
    },
  });

  if (!order) return null;

  return {
    orderNumber: order.orderNumber,
    status: order.status,
    orderType: order.orderType,
    paymentMethod: order.paymentMethod,
    paymentStatus: order.paymentStatus,
    customerName: order.customerName,
    deliveryAddress: order.deliveryAddress,
    area: order.area,
    estimatedDeliveryTime: order.estimatedDeliveryTime?.toISOString() ?? null,
    subtotal: order.subtotal.toString(),
    discountAmount: order.discountAmount.toString(),
    deliveryFee: order.deliveryFee.toString(),
    taxAmount: order.taxAmount.toString(),
    totalAmount: order.totalAmount.toString(),
    createdAt: order.createdAt.toISOString(),
    items: order.items.map((item: any) => ({
      id: item.id,
      productId: item.productId,
      productName: item.productName,
      unitPrice: item.unitPrice.toString(),
      quantity: item.quantity,
      subtotal: item.subtotal.toString(),
      specialInstructions: item.specialInstructions,
      addons: item.addons.map((a: any) => ({
        name: a.addonName,
        price: a.price.toString(),
        quantity: a.quantity,
      })),
    })),
    statusHistory: order.statusHistory.map((h: any) => ({
      status: h.status,
      note: h.note,
      createdAt: h.createdAt.toISOString(),
    })),
    reviewedProductIds: order.reviews
      .map((r: any) => r.productId)
      .filter((id: string | null): id is string => !!id),
  };
}

export type OrderDetailView = NonNullable<Awaited<ReturnType<typeof getOrderByTrackingToken>>>;

export async function getActiveDeals(limit = 10) {
  const now = new Date();
  const deals = await db.deal.findMany({
    where: { isActive: true, startDate: { lte: now }, endDate: { gte: now } },
    orderBy: { endDate: 'asc' },
    take: limit,
  });

  return deals.map((d) => ({
    id: d.id,
    title: d.title,
    description: d.description,
    imageUrl: d.imageUrl,
    discountType: d.discountType,
    discountValue: d.discountValue.toString(),
    minOrderAmount: d.minOrderAmount?.toString() ?? null,
    endDate: d.endDate.toISOString(),
  }));
}
