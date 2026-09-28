import type {
  OrderStatus,
  OrderType,
  PaymentMethod,
  PaymentStatus,
  DiscountType,
  AdminRole,
} from '@prisma/client';

// Re-export Prisma enums so the rest of the app imports types from
// one place (@/types) instead of reaching into @prisma/client directly.
export type {
  OrderStatus,
  OrderType,
  PaymentMethod,
  PaymentStatus,
  DiscountType,
  AdminRole,
};

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface CategorySummary {
  id: string;
  name: string;
  slug: string;
  imageUrl: string | null;
}

export interface ProductSummary {
  id: string;
  name: string;
  slug: string;
  price: string;
  discountPrice: string | null;
  imageUrl: string | null;
  isAvailable: boolean;
}

export interface PublicOrderStatusView {
  orderNumber: string;
  status: OrderStatus;
  estimatedDeliveryTime: string | null;
  totalAmount: string;
  createdAt: string;
}
