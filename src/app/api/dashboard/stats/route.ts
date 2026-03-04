import { NextResponse } from "next/server";
import { DateTime } from "luxon";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth/require-admin";

export async function GET() {
  try {
    const auth = await requireAdmin();
    if (auth.error) return auth.error;

    const now = DateTime.now().setZone("Asia/Kolkata");
    const todayStart = now.startOf("day").toJSDate();
    const tomorrowStart = now.plus({ days: 1 }).startOf("day").toJSDate();

    const [todayAppointments, pendingConfirmations, patientsSeenToday, totalPatients] =
      await Promise.all([
        prisma.appointment.count({
          where: {
            preferredDateTime: { gte: todayStart, lt: tomorrowStart },
          },
        }),
        prisma.appointment.count({
          where: { status: "TENTATIVE" },
        }),
        prisma.appointment.count({
          where: {
            status: "COMPLETED",
            preferredDateTime: { gte: todayStart, lt: tomorrowStart },
          },
        }),
        prisma.patient.count(),
      ]);

    return NextResponse.json({
      success: true,
      stats: {
        todayAppointments,
        pendingConfirmations,
        patientsSeenToday,
        totalPatients,
      },
    });
  } catch (error) {
    console.error("GET /api/dashboard/stats error:", error);
    return NextResponse.json(
      { success: false, error: "An unexpected error occurred." },
      { status: 500 }
    );
  }
}
