/**
 * Background job: Auto-cancel OVERDUE appointments
 *
 * This job runs at clinic closing time (e.g., 10:30 PM IST) to automatically
 * cancel OVERDUE appointments from the current day. This happens when a patient
 * didn't show up for their scheduled appointment and didn't arrive later the same day.
 *
 * Trigger: Vercel Cron at clinic closing
 * Frequency: 30 22 * * * (10:30 PM IST daily)
 *
 * Note: Only cancels today's OVERDUE appointments. Past days' OVERDUE appointments
 * are preserved for analytics and historical tracking.
 */

import { prisma } from "@/lib/prisma";
import { DateTime } from "luxon";

export async function cancelOverdueAppointments() {
  const now = DateTime.now().setZone("Asia/Kolkata");
  const todayStart = now.startOf("day");
  const todayEnd = now.endOf("day");

  try {
    // Cancel all OVERDUE appointments from today
    const result = await prisma.appointment.updateMany({
      where: {
        status: "OVERDUE",
        preferredDateTime: {
          gte: todayStart.toJSDate(),
          lte: todayEnd.toJSDate(),
        },
      },
      data: {
        status: "CANCELLED",
        notes: "Auto-cancelled: Patient no-show",
        updatedAt: now.toJSDate(),
      },
    });

    console.log(
      `[${now.toISO()}] Auto-cancelled ${result.count} overdue appointments from ${todayStart.toFormat("yyyy-MM-dd")}`
    );

    return {
      success: true,
      count: result.count,
      date: todayStart.toFormat("yyyy-MM-dd"),
      timestamp: now.toISO(),
    };
  } catch (error) {
    console.error("Error auto-cancelling overdue appointments:", error);
    return {
      success: false,
      count: 0,
      error: error instanceof Error ? error.message : "Unknown error",
      timestamp: now.toISO(),
    };
  }
}
