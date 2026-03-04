// Background job: Mark PENDING appointments as OVERDUE
// Runs every 15 minutes via Vercel Cron or manual API call.

import { prisma } from "@/lib/prisma";
import { DateTime } from "luxon";

export async function markOverdueAppointments() {
  const now = DateTime.now().setZone("Asia/Kolkata");

  try {
    // Find all PENDING appointments past their scheduled time
    const result = await prisma.appointment.updateMany({
      where: {
        status: "PENDING",
        preferredDateTime: {
          lt: now.toJSDate(),
        },
      },
      data: {
        status: "OVERDUE",
        updatedAt: now.toJSDate(),
      },
    });

    console.log(
      `[${now.toISO()}] Marked ${result.count} appointments as OVERDUE`
    );

    return {
      success: true,
      count: result.count,
      timestamp: now.toISO(),
    };
  } catch (error) {
    console.error("Error marking overdue appointments:", error);
    return {
      success: false,
      count: 0,
      error: error instanceof Error ? error.message : "Unknown error",
      timestamp: now.toISO(),
    };
  }
}
