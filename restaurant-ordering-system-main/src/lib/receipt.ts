import { db } from '@/lib/db';

/**
 * Builds the exact data set a thermal receipt needs for one order.
 *
 * IMPORTANT: every amount here is read straight from the `orders` /
 * `order_items` / `order_item_addons` rows, which were computed and
 * locked in server-side at order-creation time (see `lib/pricing.ts`).
 * This function never accepts or recalculates totals from the client —
 * it only formats what the database already trusts.
 */
export async function getOrderForReceipt(orderId: string) {
  const order = await db.order.findUnique({
    where: { id: orderId },
    include: {
      items: { include: { addons: true } },
      coupon: { select: { code: true } },
      deal: { select: { title: true } },
    },
  });

  if (!order) return null;

  return {
    id: order.id,
    orderNumber: order.orderNumber,
    createdAt: order.createdAt.toISOString(),
    customerName: order.customerName,
    customerPhone: order.customerPhone,
    orderType: order.orderType,
    deliveryAddress: order.deliveryAddress,
    area: order.area,
    deliveryInstructions: order.deliveryInstructions,
    paymentMethod: order.paymentMethod,
    subtotal: order.subtotal.toString(),
    discountAmount: order.discountAmount.toString(),
    deliveryFee: order.deliveryFee.toString(),
    taxAmount: order.taxAmount.toString(),
    totalAmount: order.totalAmount.toString(),
    couponCode: order.coupon?.code ?? null,
    dealTitle: order.deal?.title ?? null,
    items: order.items.map((item) => ({
      id: item.id,
      productName: item.productName,
      unitPrice: item.unitPrice.toString(),
      quantity: item.quantity,
      subtotal: item.subtotal.toString(),
      specialInstructions: item.specialInstructions,
      addons: item.addons.map((a) => ({
        name: a.addonName,
        price: a.price.toString(),
        quantity: a.quantity,
      })),
    })),
  };
}

export type ReceiptOrderView = NonNullable<Awaited<ReturnType<typeof getOrderForReceipt>>>;
