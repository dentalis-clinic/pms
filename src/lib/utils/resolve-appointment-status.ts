/**
 * On-demand appointment status resolver.
 * Runs two indexed updateMany queries to transition time-based statuses:
 *   PENDING  + past appointment time          → OVERDUE
 *   CONFIRMED + past appointment time + buffer → COMPLETED
 *
 * Call at the start of any API that reads appointment data.
 * Idempotent — returns count: 0 instantly when nothing needs updating.
 */

import { DateTime } from "luxon";
import { prisma } from "@/lib/prisma";
import { BUSINESS_HOURS_CONFIG } from "@/lib/config/business-hours";

export async function resolveAppointmentStatuses() {
  const now = DateTime.now().setZone(BUSINESS_HOURS_CONFIG.timezone);
  const bufferCutoff = now
    .minus({ minutes: BUSINESS_HOURS_CONFIG.slotDuration })
    .toJSDate();

  const [overdueResult, completedResult] = await Promise.all([
    // PENDING past appointment time → OVERDUE
    prisma.appointment.updateMany({
      where: {
        status: "PENDING",
        preferredDateTime: { lt: now.toJSDate() },
      },
      data: { status: "OVERDUE" },
    }),

    // CONFIRMED past appointment time + slot duration → COMPLETED
    prisma.appointment.updateMany({
      where: {
        status: "CONFIRMED",
        preferredDateTime: { lt: bufferCutoff },
      },
      data: { status: "COMPLETED" },
    }),
  ]);

  return {
    overdue: overdueResult.count,
    completed: completedResult.count,
  };
}
