import { NextResponse } from "next/server";
import { DateTime } from "luxon";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const admin = await prisma.admin.findUnique({ where: { id: user.id } });
    if (!admin) {
      return NextResponse.json(
        { success: false, error: "Forbidden" },
        { status: 403 }
      );
    }

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
