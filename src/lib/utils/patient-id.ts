import { PrismaClient, Prisma } from "@/generated/prisma/client";
import { getCurrentISTDate } from "./date";

const CLINIC_PREFIX = "DDCJ";
const MAX_RETRIES = 3;

/** Transaction client type — PrismaClient minus interactive-tx-disallowed methods. */
type TxClient = Omit<PrismaClient, "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends">;

/**
 * Generate a patient ID in the format DDCJ-YYYYMMDD-XXXX.
 * Must be called inside a Prisma $transaction with serializable isolation
 * to prevent race conditions on the daily serial number.
 *
 * @param tx - Prisma transaction client
 * @param retryOffset - Internal: offset added on unique constraint retry
 */
export async function generatePatientId(
  tx: TxClient,
  retryOffset = 0
): Promise<string> {
  const todayIST = getCurrentISTDate();
  const prefix = `${CLINIC_PREFIX}-${todayIST}`;

  const todayCount = await tx.patient.count({
    where: {
      patientId: { startsWith: prefix },
    },
  });

  const serial = (todayCount + 1 + retryOffset).toString().padStart(4, "0");
  return `${prefix}-${serial}`;
}

/**
 * Wrapper that creates a patient record with a generated ID,
 * retrying up to 3 times on unique constraint violations.
 */
export async function createPatientWithId(
  prisma: PrismaClient,
  data: Prisma.PatientCreateInput | Record<string, unknown>
): Promise<{ patientId: string; record: unknown }> {
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      const result = await prisma.$transaction(
        async (tx) => {
          const patientId = await generatePatientId(tx, attempt);
          const record = await tx.patient.create({
            data: { ...data, patientId } as Prisma.PatientCreateInput,
          });
          return { patientId, record };
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
      );
      return result;
    } catch (error: unknown) {
      const isUniqueViolation =
        error instanceof Error &&
        "code" in error &&
        (error as { code: string }).code === "P2002";

      if (isUniqueViolation && attempt < MAX_RETRIES - 1) {
        continue;
      }
      throw error;
    }
  }

  throw new Error("Failed to generate unique patient ID after max retries");
}
