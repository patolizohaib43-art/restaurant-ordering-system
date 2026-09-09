import { Prisma } from '@prisma/client';
import { db } from '@/lib/db';
import { getRestaurantSettings } from '@/lib/settings';

export class PricingError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PricingError';
  }
}

export interface RequestedItem {
  productId: string;
  quantity: number;
  specialInstructions?: string;
  addonIds?: string[];
}

export interface PricedAddon {
  addonId: string;
  name: string;
  price: Prisma.Decimal;
  quantity: number;
}

export interface PricedItem {
  productId: string;
  productName: string;
  unitPrice: Prisma.Decimal;
  quantity: number;
  subtotal: Prisma.Decimal;
  specialInstructions?: string;
  addons: PricedAddon[];
}

export interface PricingResult {
  items: PricedItem[];
  subtotal: Prisma.Decimal;
  discountAmount: Prisma.Decimal;
  deliveryFee: Prisma.Decimal;
  taxAmount: Prisma.Decimal;
  totalAmount: Prisma.Decimal;
  couponId: string | null;
  dealId: string | null;
}

const ZERO = new Prisma.Decimal(0);

/**
 * Recomputes an order's full price breakdown entirely from server-trusted
 * data (current product prices, current addon prices, current settings,
 * current coupon rules). Client-submitted prices are never used — only
 * productId / addonId / quantity selections are read from the request.
 */
export async function priceOrder(
  requestedItems: RequestedItem[],
  options: { orderType: 'DELIVERY' | 'PICKUP' | 'DINE_IN'; couponCode?: string; dealId?: string }
): Promise<PricingResult> {
  if (requestedItems.length === 0) {
    throw new PricingError('Your cart is empty.');
  }

  const settings = await getRestaurantSettings();

  if (!settings.isAcceptingOrders) {
    throw new PricingError('The restaurant is not accepting orders right now.');
  }

  const productIds = [...new Set(requestedItems.map((i) => i.productId))];
  const products = await db.product.findMany({
    where: { id: { in: productIds } },
    include: { addons: true },
  });
  const productMap = new Map(products.map((p) => [p.id, p]));

  const pricedItems: PricedItem[] = [];
  let subtotal = ZERO;

  for (const requested of requestedItems) {
    const product = productMap.get(requested.productId);

    if (!product) {
      throw new PricingError('One of the items in your cart no longer exists.');
    }
    if (!product.isAvailable) {
      throw new PricingError(`"${product.name}" is currently unavailable.`);
    }
    if (!Number.isInteger(requested.quantity) || requested.quantity <= 0) {
      throw new PricingError(`Invalid quantity for "${product.name}".`);
    }

    const unitPrice = product.discountPrice ?? product.price;
    const addonIds = [...new Set(requested.addonIds ?? [])];
    const pricedAddons: PricedAddon[] = [];
    let addonUnitTotal = ZERO;

    for (const addonId of addonIds) {
      const addon = product.addons.find((a: any) => a.id === addonId);
      if (!addon) {
        throw new PricingError(`An add-on for "${product.name}" is no longer available.`);
      }
      if (!addon.isAvailable) {
        throw new PricingError(`"${addon.name}" is currently unavailable.`);
      }
      pricedAddons.push({
        addonId: addon.id,
        name: addon.name,
        price: addon.price,
        quantity: 1,
      });
      addonUnitTotal = addonUnitTotal.plus(addon.price);
    }

    const lineSubtotal = unitPrice.plus(addonUnitTotal).times(requested.quantity);

    pricedItems.push({
      productId: product.id,
      productName: product.name,
      unitPrice,
      quantity: requested.quantity,
      subtotal: lineSubtotal,
      specialInstructions: requested.specialInstructions?.trim() || undefined,
      addons: pricedAddons,
    });

    subtotal = subtotal.plus(lineSubtotal);
  }

  if (subtotal.lessThan(settings.minOrderAmount)) {
    throw new PricingError(
      `Minimum order amount is ${settings.minOrderAmount.toString()} ${settings.currency}.`
    );
  }

  // ---- Coupon ----
  let discountAmount = ZERO;
  let couponId: string | null = null;

  if (options.couponCode && options.couponCode.trim().length > 0) {
    const code = options.couponCode.trim().toUpperCase();
    const coupon = await db.coupon.findUnique({ where: { code } });
    const now = new Date();

    if (!coupon) {
      throw new PricingError('Invalid coupon code.');
    }
    if (!coupon.isActive) {
      throw new PricingError('This coupon is no longer active.');
    }
    if (now < coupon.validFrom || now > coupon.validUntil) {
      throw new PricingError('This coupon has expired.');
    }
    if (coupon.usageLimit !== null && coupon.usedCount >= coupon.usageLimit) {
      throw new PricingError('This coupon has reached its usage limit.');
    }
    if (coupon.minOrderAmount && subtotal.lessThan(coupon.minOrderAmount)) {
      throw new PricingError(
        `This coupon requires a minimum order of ${coupon.minOrderAmount.toString()} ${settings.currency}.`
      );
    }

    discountAmount =
      coupon.discountType === 'PERCENTAGE'
        ? subtotal.times(coupon.discountValue).dividedBy(100)
        : coupon.discountValue;

    if (coupon.maxDiscountAmount && discountAmount.greaterThan(coupon.maxDiscountAmount)) {
      discountAmount = coupon.maxDiscountAmount;
    }
    if (discountAmount.greaterThan(subtotal)) {
      discountAmount = subtotal;
    }

    couponId = coupon.id;
  }

  // ---- Deal ----
  // Deals are selected from the active-deals list (no code to type), so an
  // invalid/expired/removed dealId is treated as "not applied" rather than
  // a hard error — the deal offer may have simply expired between the
  // customer viewing it and checking out.
  let dealId: string | null = null;

  if (options.dealId) {
    const deal = await db.deal.findUnique({ where: { id: options.dealId } });
    const now = new Date();

    if (
      deal &&
      deal.isActive &&
      now >= deal.startDate &&
      now <= deal.endDate &&
      (!deal.minOrderAmount || subtotal.greaterThanOrEqualTo(deal.minOrderAmount))
    ) {
      let dealDiscount =
        deal.discountType === 'PERCENTAGE'
          ? subtotal.times(deal.discountValue).dividedBy(100)
          : deal.discountValue;

      if (dealDiscount.greaterThan(subtotal)) {
        dealDiscount = subtotal;
      }

      discountAmount = discountAmount.plus(dealDiscount);
      dealId = deal.id;
    }
  }

  // Deal + coupon discounts can stack, but never exceed the subtotal.
  if (discountAmount.greaterThan(subtotal)) {
    discountAmount = subtotal;
  }

  const deliveryFee = options.orderType === 'DELIVERY' ? settings.deliveryFee : ZERO;
  const taxableAmount = subtotal.minus(discountAmount);
  const taxAmount = taxableAmount.times(settings.taxPercentage).dividedBy(100);
  const totalAmount = taxableAmount.plus(deliveryFee).plus(taxAmount);

  return {
    items: pricedItems,
    subtotal: round2(subtotal),
    discountAmount: round2(discountAmount),
    deliveryFee: round2(deliveryFee),
    taxAmount: round2(taxAmount),
    totalAmount: round2(totalAmount),
    couponId,
    dealId,
  };
}

function round2(value: Prisma.Decimal): Prisma.Decimal {
  return value.toDecimalPlaces(2);
}
