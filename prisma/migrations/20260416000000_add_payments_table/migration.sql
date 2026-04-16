-- Migration: Add payments table and PaymentMethod enum
-- Removes paidAmount from appointments (now derived from payments table)
-- totalAmount on appointments represents amountDue (after discount)

-- Step 1: Add PaymentMethod enum
CREATE TYPE "PaymentMethod" AS ENUM ('CASH', 'UPI', 'CARD', 'WAIVED', 'OTHER');

-- Step 2: Remove paidAmount column (replaced by SUM of payments)
ALTER TABLE "appointments" DROP COLUMN IF EXISTS "paid_amount";
ALTER TABLE "appointments" DROP COLUMN IF EXISTS "paidAmount";

-- Step 3: Create payments table
CREATE TABLE "payments" (
  "id"            TEXT NOT NULL,
  "appointmentId" TEXT NOT NULL,
  "amount"        DECIMAL(10, 2) NOT NULL,
  "method"        "PaymentMethod" NOT NULL,
  "paidAt"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "recordedById"  TEXT NOT NULL,
  "notes"         TEXT,
  "createdAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- Step 4: Add foreign key constraints
ALTER TABLE "payments" ADD CONSTRAINT "payments_appointmentId_fkey"
  FOREIGN KEY ("appointmentId") REFERENCES "appointments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "payments" ADD CONSTRAINT "payments_recordedById_fkey"
  FOREIGN KEY ("recordedById") REFERENCES "admins"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Step 5: Create indexes
CREATE INDEX "payments_appointmentId_idx" ON "payments"("appointmentId");
CREATE INDEX "payments_paidAt_idx" ON "payments"("paidAt");
CREATE INDEX "payments_recordedById_idx" ON "payments"("recordedById");
