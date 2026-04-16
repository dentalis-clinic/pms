-- Sync columns that were added via `db push` but never had a formal migration.
-- Written to be idempotent: each step uses IF NOT EXISTS / IF EXISTS guards.

-- Step 1: Add totalAmount if missing (appointmentId + its constraint already exist from db push)
ALTER TABLE "appointments" ADD COLUMN IF NOT EXISTS "totalAmount" DECIMAL(10, 2);

-- Step 2: Ensure index on appointmentId exists
CREATE UNIQUE INDEX IF NOT EXISTS "appointments_appointmentId_idx" ON "appointments"("appointmentId");
