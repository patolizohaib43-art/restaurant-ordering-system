/**
 * One-time admin utility — run manually, once, from your project folder:
 *   node scripts/admin-utility.js
 *
 * Does two independent things, each only if you fill in its section below:
 *   1. Update the admin's email/password/name (correctly hashed — never
 *      sets a plain-text password in the database).
 *   2. Delete ALL test orders (and their items/status history/related
 *      notifications) — nothing else. Products, categories, deals,
 *      coupons, restaurant settings, images, and the admin account
 *      itself are never touched by this script.
 *
 * Safe to delete this file afterwards; it's not used by the app itself.
 */

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const db = new PrismaClient();

// ---------------------------------------------------------------------
// STEP 1 — Admin credentials. Leave a value as `null` to leave it
// unchanged. Set CHANGE_ADMIN to false to skip this step entirely.
// ---------------------------------------------------------------------
const CHANGE_ADMIN = true;
const ADMIN_CURRENT_EMAIL = 'admin@example.com'; // the admin account to update — must match exactly
const NEW_EMAIL = 'admin@zaiqaesindh.com'; // 'admin@zaiqaesindh.com', or null to keep the current email
const NEW_PASSWORD = 'zaiqa@15'; // e.g. 'MyNewStrongPassword123!', or null to keep the current password
const NEW_NAME = 'Shahbaz Serai'; // e.g. 'Zohaib Ahmed', or null to keep the current name

// ---------------------------------------------------------------------
// STEP 2 — Clean test order history. Set to true to delete every order
// (and its items, status history, and the "New Order" notifications
// pointing to them). Products, categories, deals, coupons, settings,
// and images are never touched by this step.
// ---------------------------------------------------------------------
const CLEAN_TEST_ORDERS = true;

async function main() {
  if (CHANGE_ADMIN) {
    const admin = await db.admin.findUnique({ where: { email: ADMIN_CURRENT_EMAIL } });
    if (!admin) {
      console.error(`No admin found with email "${ADMIN_CURRENT_EMAIL}" — check ADMIN_CURRENT_EMAIL above.`);
    } else {
      const data = {};
      if (NEW_EMAIL) data.email = NEW_EMAIL;
      if (NEW_NAME) data.name = NEW_NAME;
      if (NEW_PASSWORD) data.passwordHash = await bcrypt.hash(NEW_PASSWORD, 12);

      if (Object.keys(data).length === 0) {
        console.log('CHANGE_ADMIN is true but no NEW_* values were set — nothing to update.');
      } else {
        await db.admin.update({ where: { id: admin.id }, data });
        console.log(
          `Admin updated: ${NEW_EMAIL ? `email → ${NEW_EMAIL}` : ''} ${NEW_NAME ? `name → ${NEW_NAME}` : ''} ${
            NEW_PASSWORD ? 'password → (changed)' : ''
          }`.trim()
        );
      }
    }
  }

  if (CLEAN_TEST_ORDERS) {
    // Notifications first (Order → Notification is a SetNull relation,
    // not a cascade, so these would otherwise be left pointing at
    // nothing rather than being cleaned up).
    const deletedNotifications = await db.notification.deleteMany({
      where: { relatedOrderId: { not: null } },
    });
    // OrderItem, OrderItemAddon, and OrderStatusHistory all cascade
    // automatically when their parent Order is deleted.
    const deletedOrders = await db.order.deleteMany({});
    console.log(
      `Deleted ${deletedOrders.count} order(s) and ${deletedNotifications.count} related notification(s). Products, categories, deals, coupons, settings, and images were not touched.`
    );
  }
}

main()
  .catch((err) => {
    console.error('Script failed:', err);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
