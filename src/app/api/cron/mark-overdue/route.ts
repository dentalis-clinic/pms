// Cron endpoint: Mark overdue appointments
// Runs every 15 minutes to mark PENDING appointments as OVERDUE.
// Vercel Cron Schedule: every 15 minutes
// Manual test: curl http://localhost:3000/api/cron/mark-overdue

import { NextResponse } from "next/server";
import { markOverdueAppointments } from "@/lib/jobs/mark-overdue-appointments";

export async function GET() {
  try {
    const result = await markOverdueAppointments();

    return NextResponse.json(result, {
      status: result.success ? 200 : 500,
    });
  } catch (error) {
    console.error("Cron job error (mark-overdue):", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
