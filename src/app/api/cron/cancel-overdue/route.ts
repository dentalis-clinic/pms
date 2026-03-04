/**
 * Cron endpoint: Auto-cancel overdue appointments
 *
 * Runs at clinic closing time (10:30 PM IST) to automatically cancel
 * OVERDUE appointments from the current day.
 *
 * Vercel Cron Schedule: "30 22 * * *" (10:30 PM IST daily)
 * Note: Vercel cron uses UTC, so adjust schedule accordingly:
 * 10:30 PM IST = 5:00 PM UTC (IST is UTC+5:30)
 *
 * Can also be triggered manually for testing:
 * curl http://localhost:3000/api/cron/cancel-overdue
 */

import { NextResponse } from "next/server";
import { cancelOverdueAppointments } from "@/lib/jobs/cancel-overdue-appointments";

export async function GET() {
  try {
    const result = await cancelOverdueAppointments();

    return NextResponse.json(result, {
      status: result.success ? 200 : 500,
    });
  } catch (error) {
    console.error("Cron job error (cancel-overdue):", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
