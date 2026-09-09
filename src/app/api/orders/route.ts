import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { apiSuccess, apiError } from '@/lib/api-response';
import { createOrderSchema } from '@/validation/schemas';
import { priceOrder, PricingError } from '@/lib/pricing';
import { generateOrderNumber, generateSecureToken } from '@/lib/tokens';
import { rateLimit, getClientIp } from '@/lib/rate-limit';

// Abuse protection: caps how many orders a single IP can place in a short
// window (a genuine customer never needs more than this). See
// src/lib/rate-limit.ts for the documented single-instance limitation.
const ORDER_ATTEMPT_LIMIT = 15;
const ORDER_WINDOW_MS = 15 * 60 * 1000;

export async function POST(request: NextRequest) {
  try {
    const ip = getClientIp(request);
    const limitResult = rateLimit(`order-create:${ip}`, ORDER_ATTEMPT_LIMIT, ORDER_WINDOW_MS);
    if (!limitResult.success) {
      return apiError('Too many orders placed. Please try again later.', 429);
    }

    const body = await request.json();
    const parsed = createOrderSchema.safeParse(body);
    if (!parsed.success) {
      return apiError(parsed.error.errors[0]?.message ?? 'Invalid order data.');
    }

    const input = parsed.data;

    if (input.orderType === 'DELIVERY' && !input.deliveryAddress?.trim()) {
      return apiError('Delivery address is required for delivery orders.');
    }

    // Server-side price recomputation — the ONLY source of truth for totals.
    const pricing = await priceOrder(input.items, {
      orderType: input.orderType,
      couponCode: input.couponCode,
      dealId: input.dealId,
    });

    const trackingToken = generateSecureToken(24);

    const order = await db.$transaction(async (tx: typeof db) => {
      const orderNumber = await generateOrderNumber(tx);

      const created = await tx.order.create({
        data: {
          orderNumber,
          trackingToken,
          customerName: input.customerName.trim(),
          customerPhone: input.customerPhone.trim(),
          customerEmail: input.customerEmail?.trim() || null,
          orderType: input.orderType,
          deliveryAddress: input.deliveryAddress?.trim() || null,
          area: input.area?.trim() || null,
          deliveryInstructions: input.deliveryInstructions?.trim() || null,
          subtotal: pricing.subtotal,
          discountAmount: pricing.discountAmount,
          deliveryFee: pricing.deliveryFee,
          taxAmount: pricing.taxAmount,
          totalAmount: pricing.totalAmount,
          couponId: pricing.couponId,
          dealId: pricing.dealId,
          paymentMethod: input.paymentMethod,
          status: 'PENDING',
          paymentStatus: 'PENDING',
          items: {
            create: pricing.items.map((item) => ({
              productId: item.productId,
              productName: item.productName,
              unitPrice: item.unitPrice,
              quantity: item.quantity,
              subtotal: item.subtotal,
              specialInstructions: item.specialInstructions ?? null,
              addons: {
                create: item.addons.map((addon) => ({
                  addonId: addon.addonId,
                  addonName: addon.name,
                  price: addon.price,
                  quantity: addon.quantity,
                })),
              },
            })),
          },
          statusHistory: {
            create: { status: 'PENDING', note: 'Order placed by customer.' },
          },
        },
      });

      if (pricing.couponId) {
        await tx.coupon.update({
          where: { id: pricing.couponId },
          data: { usedCount: { increment: 1 } },
        });
      }

      await tx.notification.create({
        data: {
          type: 'NEW_ORDER',
          title: 'New order received',
          message: `Order ${orderNumber} placed by ${input.customerName.trim()}.`,
          relatedOrderId: created.id,
        },
      });

      return created;
    });

    return apiSuccess(
      {
        orderNumber: order.orderNumber,
        trackingToken: order.trackingToken,
        totalAmount: order.totalAmount.toString(),
      },
      201
    );
  } catch (error) {
    if (error instanceof PricingError) {
      return apiError(error.message, 422);
    }
    console.error('POST /api/orders failed:', error);
    return apiError('Could not place order. Please try again.', 500);
  }
}
