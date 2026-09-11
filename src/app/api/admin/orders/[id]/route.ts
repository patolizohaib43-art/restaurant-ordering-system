import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { apiSuccess, apiError } from '@/lib/api-response';
import { getRestaurantSettings } from '@/lib/settings';
import { getRestaurantTimeZone } from '@/lib/timezone';

export async function GET(_request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const [order, settings] = await Promise.all([
      db.order.findUnique({
        where: { id: params.id },
        include: {
          items: { include: { addons: true } },
          statusHistory: { orderBy: { createdAt: 'asc' }, include: { changedBy: { select: { name: true } } } },
          coupon: { select: { code: true } },
          deal: { select: { title: true } },
        },
      }),
      getRestaurantSettings(),
    ]);

    if (!order) return apiError('Order not found.', 404);

    return apiSuccess({
      id: order.id,
      orderNumber: order.orderNumber,
      trackingToken: order.trackingToken,
      status: order.status,
      orderType: order.orderType,
      paymentMethod: order.paymentMethod,
      paymentStatus: order.paymentStatus,
      customerName: order.customerName,
      customerPhone: order.customerPhone,
      customerEmail: order.customerEmail,
      deliveryAddress: order.deliveryAddress,
      area: order.area,
      deliveryInstructions: order.deliveryInstructions,
      subtotal: order.subtotal.toString(),
      discountAmount: order.discountAmount.toString(),
      deliveryFee: order.deliveryFee.toString(),
      taxAmount: order.taxAmount.toString(),
      totalAmount: order.totalAmount.toString(),
      couponCode: order.coupon?.code ?? null,
      dealTitle: order.deal?.title ?? null,
      createdAt: order.createdAt.toISOString(),
      timezone: getRestaurantTimeZone(settings.timezone),
      items: order.items.map((item: any) => ({
        id: item.id,
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
        changedBy: h.changedBy?.name ?? null,
        createdAt: h.createdAt.toISOString(),
      })),
    });
  } catch (error) {
    console.error('GET /api/admin/orders/[id] failed:', error);
    return apiError('Could not load order.', 500);
  }
}
