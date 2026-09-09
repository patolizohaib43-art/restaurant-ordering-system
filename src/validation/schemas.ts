import { z } from 'zod';

export const orderLookupSchema = z.object({
  orderNumber: z.string().trim().min(3).max(40),
  phone: z.string().trim().min(6).max(30),
});

export const adminLoginSchema = z.object({
  email: z.string().email('Enter a valid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

export const categorySchema = z.object({
  name: z.string().min(2).max(100),
  description: z.string().max(500).optional(),
  imageUrl: z.string().url().optional().or(z.literal('')),
  isActive: z.boolean().optional(),
  sortOrder: z.number().int().optional(),
});

export const productSchema = z.object({
  categoryId: z.string().cuid(),
  name: z.string().min(2).max(150),
  description: z.string().max(1000).optional(),
  price: z.number().positive('Price must be greater than 0'),
  discountPrice: z.number().positive().optional(),
  imageUrl: z.string().url().optional().or(z.literal('')),
  isAvailable: z.boolean().optional(),
  isFeatured: z.boolean().optional(),
  preparationTime: z.number().int().positive().optional(),
});

export const productAddonSchema = z.object({
  productId: z.string().cuid(),
  name: z.string().min(1).max(100),
  price: z.number().min(0),
  maxQuantity: z.number().int().positive().default(1),
});

export const couponSchema = z.object({
  code: z
    .string()
    .min(3)
    .max(30)
    .regex(/^[A-Z0-9_-]+$/, 'Code must be uppercase letters, numbers, - or _'),
  discountType: z.enum(['PERCENTAGE', 'FIXED']),
  discountValue: z.number().positive(),
  minOrderAmount: z.number().min(0).optional(),
  maxDiscountAmount: z.number().min(0).optional(),
  usageLimit: z.number().int().positive().optional(),
  validFrom: z.coerce.date(),
  validUntil: z.coerce.date(),
});

export const createOrderSchema = z.object({
  customerName: z.string().min(2, 'Enter your name').max(100),
  customerPhone: z
    .string()
    .min(7, 'Enter a valid mobile number')
    .max(20)
    .regex(/^[0-9+\-\s()]+$/, 'Enter a valid mobile number'),
  customerEmail: z.string().email().optional().or(z.literal('')),
  orderType: z.enum(['DELIVERY', 'PICKUP', 'DINE_IN']),
  deliveryAddress: z.string().max(300).optional(),
  area: z.string().max(100).optional(),
  deliveryInstructions: z.string().max(300).optional(),
  couponCode: z.string().max(30).optional(),
  dealId: z.string().min(1).optional(),
  paymentMethod: z.enum(['CASH_ON_DELIVERY', 'CARD', 'ONLINE_WALLET']),
  items: z
    .array(
      z.object({
        productId: z.string().min(1),
        quantity: z.number().int().positive().max(50),
        specialInstructions: z.string().max(300).optional(),
        addonIds: z.array(z.string().min(1)).optional(),
      })
    )
    .min(1, 'Order must contain at least one item'),
});

export const couponValidateSchema = z.object({
  code: z.string().min(1).max(30),
  subtotal: z.number().min(0),
});

export const reviewSchema = z.object({
  trackingToken: z.string().min(10),
  productId: z.string().min(1),
  rating: z.number().int().min(1).max(5),
  comment: z.string().max(500).optional(),
});

export const printSettingsSchema = z.object({
  receiptWidth: z.enum(['MM_58', 'MM_80']).optional(),
  autoPrintNewOrders: z.boolean().optional(),
  notificationSoundEnabled: z.boolean().optional(),
  restaurantName: z.string().trim().min(1).max(120).optional(),
  tagline: z.string().trim().max(160).optional(),
  logoUrl: z.string().trim().max(500).optional(),
});

export type AdminLoginInput = z.infer<typeof adminLoginSchema>;
export type CreateOrderInput = z.infer<typeof createOrderSchema>;
export type ReviewInput = z.infer<typeof reviewSchema>;
