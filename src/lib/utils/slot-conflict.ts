import { PrismaClient, Prisma, type AppointmentStatus } from "@/generated/prisma/client";
import type { TxClient } from "./patient-id";
import { generateAppointmentId } from "./patient-id";

/** Statuses that occupy a slot (block new bookings). */
const BLOCKING_STATUSES: AppointmentStatus[] = [
  "PENDING",
  "OVERDUE",
  "CONFIRMED",
  "COMPLETED",
];

export class SlotConflictError extends Error {
  constructor(message = "This time slot is already booked. Please choose another time.") {
    super(message);
    this.name = "SlotConflictError";
  }
}

/**
 * Check for slot conflicts inside a transaction.
 * Throws SlotConflictError if the slot is taken.
 */
export async function checkSlotConflict(
  tx: TxClient,
  preferredDateTime: Date,
  excludeId?: string
): Promise<void> {
  const where: {
    preferredDateTime: Date;
    status: { in: AppointmentStatus[] };
    id?: { not: string };
  } = {
    preferredDateTime,
    status: { in: BLOCKING_STATUSES },
  };

  if (excludeId) {
    where.id = { not: excludeId };
  }

  const conflict = await tx.appointment.findFirst({ where });

  if (conflict) {
    throw new SlotConflictError();
  }
}

/**
 * Create an appointment atomically with slot conflict checking.
 * Uses Serializable isolation to prevent race conditions.
 */
export async function createAppointmentAtomic(
  prisma: PrismaClient,
  opts: {
    data: Omit<Prisma.AppointmentUncheckedCreateInput, "appointmentId">;
    allowOverride?: boolean;
  }
) {
  const { data, allowOverride = false } = opts;

  return prisma.$transaction(
    async (tx) => {
      if (!allowOverride) {
        await checkSlotConflict(tx, data.preferredDateTime as Date);
      }
      const appointmentId = await generateAppointmentId(tx);
      return tx.appointment.create({ data: { ...data, appointmentId } });
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
  );
}

/**
 * Update an appointment atomically with slot conflict checking
 * when preferredDateTime changes.
 */
export async function updateAppointmentAtomic(
  prisma: PrismaClient,
  opts: {
    id: string;
    data: Record<string, unknown>;
    newPreferredDateTime?: Date;
    allowOverride?: boolean;
  }
) {
  const { id, data, newPreferredDateTime, allowOverride = false } = opts;

  return prisma.$transaction(
    async (tx) => {
      if (newPreferredDateTime && !allowOverride) {
        await checkSlotConflict(tx, newPreferredDateTime, id);
      }
      return tx.appointment.update({
        where: { id },
        data,
        include: { patient: true, prescription: true },
      });
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
  );
}
