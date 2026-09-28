-- Additive-only migration for: Easypaisa/JazzCash online payment + phone tracking.
-- Safe on production: only ADDS an enum, nullable columns and columns with
-- defaults. No existing data is changed or removed.
-- Equivalent to running:  npx prisma db push
-- (Use ONE of the two, not both.)

CREATE TYPE "PaymentProvider" AS ENUM ('EASYPAISA', 'JAZZCASH');

ALTER TABLE "orders"
  ADD COLUMN "customerPhoneNormalized" TEXT,
  ADD COLUMN "paymentProvider" "PaymentProvider",
  ADD COLUMN "paymentReference" TEXT,
  ADD COLUMN "paymentSenderNumber" TEXT,
  ADD COLUMN "paymentVerifiedAt" TIMESTAMP(3),
  ADD COLUMN "paymentNote" TEXT;

CREATE INDEX "orders_customerPhoneNormalized_idx" ON "orders"("customerPhoneNormalized");
CREATE INDEX "orders_paymentProvider_paymentReference_idx" ON "orders"("paymentProvider", "paymentReference");

ALTER TABLE "restaurant_settings"
  ADD COLUMN "onlinePaymentEnabled" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "easypaisaEnabled" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "easypaisaNumber" TEXT,
  ADD COLUMN "easypaisaAccountName" TEXT,
  ADD COLUMN "jazzcashEnabled" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "jazzcashNumber" TEXT,
  ADD COLUMN "jazzcashAccountName" TEXT,
  ADD COLUMN "paymentInstructions" TEXT;
