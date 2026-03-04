/*
  Migration: Separate booking channel and visit type

  This migration:
  1. Adds new enums: BookingChannel, VisitType, AppointmentPriority
  2. Adds new status values: PENDING, OVERDUE
  3. Migrates existing TENTATIVE → PENDING
  4. Separates conflated `type` field into bookingChannel + visitType
  5. Migrates existing data: PATIENT_BOOKING, WALK_IN, FOLLOW_UP → new fields
*/

-- Step 1: Create new enums
CREATE TYPE "BookingChannel" AS ENUM ('ONLINE', 'PHONE', 'WALK_IN', 'SMS', 'WHATSAPP');
CREATE TYPE "VisitType" AS ENUM ('NEW_CONSULTATION', 'FOLLOW_UP');
CREATE TYPE "AppointmentPriority" AS ENUM ('ROUTINE', 'URGENT', 'EMERGENCY');

-- Step 2: Add new status values to AppointmentStatus enum
ALTER TYPE "AppointmentStatus" ADD VALUE 'PENDING';
ALTER TYPE "AppointmentStatus" ADD VALUE 'OVERDUE';

-- Step 3: Add new columns as nullable (to allow data migration)
ALTER TABLE "appointments"
  ADD COLUMN "bookingChannel" "BookingChannel",
  ADD COLUMN "visitType" "VisitType",
  ADD COLUMN "priority" "AppointmentPriority";

-- Step 4: Migrate existing status data (TENTATIVE → PENDING)
UPDATE "appointments"
SET "status" = 'PENDING'::"AppointmentStatus"
WHERE "status" = 'TENTATIVE';

-- Step 5: Migrate existing type data to new fields
UPDATE "appointments" SET
  "bookingChannel" = CASE
    WHEN "type" = 'PATIENT_BOOKING' THEN 'ONLINE'::"BookingChannel"
    WHEN "type" = 'WALK_IN' THEN 'WALK_IN'::"BookingChannel"
    WHEN "type" = 'FOLLOW_UP' THEN 'WALK_IN'::"BookingChannel"  -- Assume walk-in for follow-ups
    ELSE 'WALK_IN'::"BookingChannel"  -- Fallback
  END,
  "visitType" = CASE
    WHEN "type" = 'PATIENT_BOOKING' THEN 'NEW_CONSULTATION'::"VisitType"
    WHEN "type" = 'WALK_IN' THEN 'NEW_CONSULTATION'::"VisitType"
    WHEN "type" = 'FOLLOW_UP' THEN 'FOLLOW_UP'::"VisitType"
    ELSE 'NEW_CONSULTATION'::"VisitType"  -- Fallback
  END;

-- Step 6: Make new columns non-nullable after migration
ALTER TABLE "appointments"
  ALTER COLUMN "bookingChannel" SET NOT NULL,
  ALTER COLUMN "visitType" SET NOT NULL;

-- Step 7: Make old `type` field optional (keep for backward compatibility)
ALTER TABLE "appointments" ALTER COLUMN "type" DROP NOT NULL;

-- Step 8: Change default status to PENDING
ALTER TABLE "appointments" ALTER COLUMN "status" SET DEFAULT 'PENDING';

-- Step 9: Create indexes on new columns
CREATE INDEX "appointments_bookingChannel_idx" ON "appointments"("bookingChannel");
CREATE INDEX "appointments_visitType_idx" ON "appointments"("visitType");
