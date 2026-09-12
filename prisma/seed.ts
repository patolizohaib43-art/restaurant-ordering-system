import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

// Seed data intentionally ships WITHOUT stock/random photos. Using
// Picsum/wallpaper images and labeling them as food would be misleading —
// the admin should upload real photos of the actual dishes via the
// Products/Categories/Deals image upload UI. Cards render a clean
// "no image yet" placeholder until then (see ProductCard, CategoryCard).
function img(_seed: string) {
  return null;
}

async function main() {
  // ---------------- One-time cleanup: remove leftover Picsum URLs ----------------
  // Earlier seed runs (before this fix) wrote real https://picsum.photos/...
  // URLs into the database. Re-running `prisma db seed` alone does NOT fix
  // already-existing rows — Prisma's `upsert` here only sets `imageUrl` on
  // first `create`, never on `update` — so those wallpaper images would
  // otherwise persist forever. This targets ONLY picsum.photos URLs, so any
  // real photo an admin has since uploaded through the Products/Categories
  // /Deals image upload UI is left completely untouched.
  const [clearedCategories, clearedProducts, clearedDeals] = await Promise.all([
    prisma.category.updateMany({
      where: { imageUrl: { contains: 'picsum.photos' } },
      data: { imageUrl: null },
    }),
    prisma.product.updateMany({
      where: { imageUrl: { contains: 'picsum.photos' } },
      data: { imageUrl: null },
    }),
    prisma.deal.updateMany({
      where: { imageUrl: { contains: 'picsum.photos' } },
      data: { imageUrl: null },
    }),
  ]);
  const totalCleared = clearedCategories.count + clearedProducts.count + clearedDeals.count;
  if (totalCleared > 0) {
    console.log(
      `Cleared ${totalCleared} leftover Picsum placeholder image(s) (${clearedCategories.count} categories, ${clearedProducts.count} products, ${clearedDeals.count} deals).`
    );
  }

  // ---------------- Admin ----------------
  const email = process.env.SEED_ADMIN_EMAIL ?? 'admin@example.com';
  const password = process.env.SEED_ADMIN_PASSWORD ?? 'ChangeMe123!';
  const name = process.env.SEED_ADMIN_NAME ?? 'Super Admin';
  const passwordHash = await bcrypt.hash(password, 12);

  const admin = await prisma.admin.upsert({
    where: { email },
    update: {},
    create: { name, email, passwordHash, role: 'SUPER_ADMIN' },
  });

  // ---------------- Restaurant Settings ----------------
  const openingHours = {
    sun: { open: '12:00', close: '24:00' },
    mon: { open: '12:00', close: '24:00' },
    tue: { open: '12:00', close: '24:00' },
    wed: { open: '12:00', close: '24:00' },
    thu: { open: '12:00', close: '24:00' },
    fri: { open: '14:00', close: '24:00' },
    sat: { open: '12:00', close: '24:00' },
  };

  await prisma.restaurantSettings.upsert({
    where: { id: 'default-settings' },
    update: {
      restaurantName: 'Zaiqa-e-Sindh',
      tagline: 'Fast Food BBQ & Pizza',
      logoUrl: '/brand/logo-icon.png',
      currency: 'PKR',
      deliveryFee: 150,
      minOrderAmount: 300,
      taxPercentage: 0,
      isAcceptingOrders: true,
      address: 'Shahrah-e-Faisal, Karachi, Sindh, Pakistan',
      phone: '+92 300 1234567',
      openingHours,
    },
    create: {
      id: 'default-settings',
      restaurantName: 'Zaiqa-e-Sindh',
      tagline: 'Fast Food BBQ & Pizza',
      logoUrl: '/brand/logo-icon.png',
      currency: 'PKR',
      deliveryFee: 150,
      minOrderAmount: 300,
      taxPercentage: 0,
      isAcceptingOrders: true,
      address: 'Shahrah-e-Faisal, Karachi, Sindh, Pakistan',
      phone: '+92 300 1234567',
      openingHours,
    },
  });

  // ---------------- Categories ----------------
  const categoryData = [
    { name: 'Sindhi Specials', slug: 'sindhi-specials', sortOrder: 1 },
    { name: 'BBQ & Grill', slug: 'bbq-grill', sortOrder: 2 },
    { name: 'Karahi', slug: 'karahi', sortOrder: 3 },
    { name: 'Biryani & Rice', slug: 'biryani-rice', sortOrder: 4 },
    { name: 'Fast Food', slug: 'fast-food', sortOrder: 5 },
    { name: 'Beverages', slug: 'beverages', sortOrder: 6 },
  ];

  const categories: Record<string, string> = {};
  for (const c of categoryData) {
    const category = await prisma.category.upsert({
      where: { slug: c.slug },
      update: { name: c.name, sortOrder: c.sortOrder, isActive: true },
      create: {
        name: c.name,
        slug: c.slug,
        sortOrder: c.sortOrder,
        imageUrl: img(c.slug),
        isActive: true,
      },
    });
    categories[c.slug] = category.id;
  }

  // ---------------- Products ----------------
  interface SeedProduct {
    name: string;
    slug: string;
    category: string;
    description: string;
    price: number;
    discountPrice?: number;
    isFeatured?: boolean;
    preparationTime?: number;
    addons?: { name: string; price: number }[];
  }

  const products: SeedProduct[] = [
    {
      name: 'Sindhi Biryani',
      slug: 'sindhi-biryani',
      category: 'sindhi-specials',
      description: 'Fragrant basmati rice layered with tender mutton, potatoes, and traditional Sindhi spices.',
      price: 650,
      discountPrice: 550,
      isFeatured: true,
      preparationTime: 25,
      addons: [
        { name: 'Extra Raita', price: 60 },
        { name: 'Boiled Egg', price: 40 },
        { name: 'Extra Potato', price: 50 },
      ],
    },
    {
      name: 'Sindhi Kadhi',
      slug: 'sindhi-kadhi',
      category: 'sindhi-specials',
      description: 'Traditional gram-flour curry with seasonal vegetables, served with steamed rice.',
      price: 450,
      preparationTime: 20,
    },
    {
      name: 'Seekh Kabab (6 pcs)',
      slug: 'seekh-kabab',
      category: 'bbq-grill',
      description: 'Juicy minced beef skewers, char-grilled over charcoal with a smoky finish.',
      price: 480,
      isFeatured: true,
      preparationTime: 20,
      addons: [
        { name: 'Extra Chutney', price: 30 },
        { name: 'Naan', price: 40 },
      ],
    },
    {
      name: 'Chicken Tikka (Full)',
      slug: 'chicken-tikka',
      category: 'bbq-grill',
      description: 'Marinated chicken leg pieces, roasted to perfection with a smoky charcoal aroma.',
      price: 620,
      preparationTime: 25,
      addons: [{ name: 'Extra Chutney', price: 30 }],
    },
    {
      name: 'Chicken Karahi (Half)',
      slug: 'chicken-karahi-half',
      category: 'karahi',
      description: 'Classic tomato-based chicken karahi cooked with green chilies and fresh ginger.',
      price: 950,
      isFeatured: true,
      preparationTime: 30,
      addons: [
        { name: 'Extra Naan', price: 40 },
        { name: 'Extra Spicy', price: 0 },
      ],
    },
    {
      name: 'Mutton Karahi (Half)',
      slug: 'mutton-karahi-half',
      category: 'karahi',
      description: 'Rich, slow-cooked mutton karahi in a thick tomato and spice gravy.',
      price: 1450,
      preparationTime: 40,
    },
    {
      name: 'Chicken Biryani',
      slug: 'chicken-biryani',
      category: 'biryani-rice',
      description: 'Aromatic basmati rice cooked with tender chicken and a blend of signature spices.',
      price: 380,
      isFeatured: true,
      preparationTime: 20,
      addons: [
        { name: 'Extra Raita', price: 60 },
        { name: 'Boiled Egg', price: 40 },
      ],
    },
    {
      name: 'Plain Rice',
      slug: 'plain-rice',
      category: 'biryani-rice',
      description: 'Steamed basmati rice, the perfect side for any curry.',
      price: 180,
      preparationTime: 10,
    },
    {
      name: 'Zinger Burger',
      slug: 'zinger-burger',
      category: 'fast-food',
      description: 'Crispy fried chicken fillet with fresh lettuce and mayo in a soft sesame bun.',
      price: 420,
      preparationTime: 15,
      addons: [
        { name: 'Extra Cheese', price: 50 },
        { name: 'French Fries', price: 150 },
      ],
    },
    {
      name: 'Chicken Shawarma',
      slug: 'chicken-shawarma',
      category: 'fast-food',
      description: 'Grilled chicken strips wrapped in soft bread with garlic sauce and pickles.',
      price: 280,
      preparationTime: 10,
      addons: [{ name: 'Extra Garlic Sauce', price: 30 }],
    },
    {
      name: 'French Fries',
      slug: 'french-fries',
      category: 'fast-food',
      description: 'Golden, crispy salted fries.',
      price: 200,
      preparationTime: 10,
    },
    {
      name: 'Soft Drink (500ml)',
      slug: 'soft-drink',
      category: 'beverages',
      description: 'Chilled carbonated soft drink of your choice.',
      price: 120,
      preparationTime: 2,
    },
    {
      name: 'Fresh Lime Soda',
      slug: 'fresh-lime-soda',
      category: 'beverages',
      description: 'Refreshing lime soda, sweet or salted.',
      price: 150,
      preparationTime: 5,
    },
  ];

  for (const [index, p] of products.entries()) {
    const product = await prisma.product.upsert({
      where: { slug: p.slug },
      update: {
        name: p.name,
        description: p.description,
        price: p.price,
        discountPrice: p.discountPrice ?? null,
        isFeatured: p.isFeatured ?? false,
        isAvailable: true,
        preparationTime: p.preparationTime,
        sortOrder: index,
      },
      create: {
        categoryId: categories[p.category],
        name: p.name,
        slug: p.slug,
        description: p.description,
        price: p.price,
        discountPrice: p.discountPrice ?? null,
        imageUrl: img(p.slug),
        isFeatured: p.isFeatured ?? false,
        preparationTime: p.preparationTime,
        sortOrder: index,
      },
    });

    if (p.addons) {
      for (const addon of p.addons) {
        const existing = await prisma.productAddon.findFirst({
          where: { productId: product.id, name: addon.name },
        });
        if (!existing) {
          await prisma.productAddon.create({
            data: { productId: product.id, name: addon.name, price: addon.price },
          });
        }
      }
    }
  }

  // ---------------- Deals ----------------
  const now = new Date();
  const in30Days = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

  await prisma.deal.upsert({
    where: { id: 'deal-weekend-biryani' },
    update: {},
    create: {
      id: 'deal-weekend-biryani',
      title: 'Weekend Biryani Deal',
      description: 'Get 15% off on all Biryani & Rice orders every weekend.',
      discountType: 'PERCENTAGE',
      discountValue: 15,
      minOrderAmount: 500,
      startDate: now,
      endDate: in30Days,
      imageUrl: img('deal-biryani'),
      isActive: true,
    },
  });

  await prisma.deal.upsert({
    where: { id: 'deal-family-bbq' },
    update: {},
    create: {
      id: 'deal-family-bbq',
      title: 'Family BBQ Platter Discount',
      description: 'Flat Rs. 200 off on orders above Rs. 2000 from BBQ & Grill.',
      discountType: 'FIXED',
      discountValue: 200,
      minOrderAmount: 2000,
      startDate: now,
      endDate: in30Days,
      imageUrl: img('deal-bbq'),
      isActive: true,
    },
  });

  // ---------------- Coupon ----------------
  await prisma.coupon.upsert({
    where: { code: 'WELCOME10' },
    update: {},
    create: {
      code: 'WELCOME10',
      description: '10% off for new customers',
      discountType: 'PERCENTAGE',
      discountValue: 10,
      minOrderAmount: 400,
      maxDiscountAmount: 300,
      usageLimit: 500,
      validFrom: now,
      validUntil: in30Days,
      isActive: true,
    },
  });

  console.log('Seed complete.');
  console.log(`Admin: ${admin.email} (change the seed password after first login)`);
  console.log('Restaurant: Zaiqa-e-Sindh - categories, products, deals, and coupon WELCOME10 seeded.');
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
