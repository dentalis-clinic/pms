import { PrismaClient, Prisma } from "@/generated/prisma/client";
import { getCurrentISTDate } from "./date";
import type { TxClient } from "./patient-id";

const PRESCRIPTION_PREFIX = "RX";
const MAX_RETRIES = 3;

/**
 * Generate a prescription ID in the format RX-YYYYMMDD-XXXX.
 * Must be called inside a serializable Prisma transaction.
 */
export async function generatePrescriptionId(
  tx: TxClient,
  retryOffset = 0
): Promise<string> {
  const todayIST = getCurrentISTDate();
  const prefix = `${PRESCRIPTION_PREFIX}-${todayIST}`;

  const todayCount = await tx.prescription.count({
    where: { prescriptionId: { startsWith: prefix } },
  });

  const serial = (todayCount + 1 + retryOffset).toString().padStart(4, "0");
  return `${prefix}-${serial}`;
}

/**
 * Create a prescription with a generated RX ID inside a serializable transaction.
 * Also auto-updates the appointment status to CONFIRMED.
 */
export async function createPrescriptionWithId(
  prisma: PrismaClient,
  data: {
    appointmentId: string;
    diagnosis: string;
    medications: unknown;
    treatmentPlan?: string | null;
    nextVisitDate?: Date | null;
    advice?: string | null;
    prescribedById: string;
  }
): Promise<{ prescriptionId: string; record: unknown }> {
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      const result = await prisma.$transaction(
        async (tx) => {
          const prescriptionId = await generatePrescriptionId(tx, attempt);
          const record = await tx.prescription.create({
            data: {
              prescriptionId,
              appointmentId: data.appointmentId,
              diagnosis: data.diagnosis,
              medications: data.medications as Prisma.InputJsonValue,
              treatmentPlan: data.treatmentPlan || null,
              nextVisitDate: data.nextVisitDate || null,
              advice: data.advice || null,
              prescribedById: data.prescribedById,
            },
          });

          // Auto-confirm the appointment
          await tx.appointment.update({
            where: { id: data.appointmentId },
            data: { status: "CONFIRMED" },
          });

          return { prescriptionId, record };
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
      );
      return result;
    } catch (error: unknown) {
      const isUniqueViolation =
        error instanceof Error &&
        "code" in error &&
        (error as { code: string }).code === "P2002";

      if (isUniqueViolation && attempt < MAX_RETRIES - 1) continue;
      throw error;
    }
  }

  throw new Error(
    "Failed to generate unique prescription ID after max retries"
  );
}
