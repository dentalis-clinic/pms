import { NextRequest, NextResponse } from "next/server";
import { DateTime } from "luxon";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth/require-admin";
import type {
  AppointmentStatus,
  AppointmentType,
} from "@/generated/prisma/client";

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAdmin();
    if (auth.error) return auth.error;

    // Query params
    const { searchParams } = request.nextUrl;
    const q = searchParams.get("q")?.trim() ?? "";
    const statusFilter = searchParams.get("status") ?? "";
    const typeFilter = searchParams.get("type") ?? "";
    const dateFilter = searchParams.get("dateFilter") ?? "all";
    const sortBy = searchParams.get("sortBy") ?? "createdAt";
    const sortOrder = searchParams.get("sortOrder") === "asc" ? "asc" : "desc";

    // Whitelist sortable columns
    const allowedSortColumns: Record<string, Record<string, string>> = {
      createdAt: { createdAt: sortOrder },
      preferredDateTime: { preferredDateTime: sortOrder },
      status: { status: sortOrder },
      type: { type: sortOrder },
    };

    const orderBy = allowedSortColumns[sortBy] ?? { createdAt: sortOrder };

    // Build where clause
    const where: Record<string, unknown> = {};

    // Server-side date filtering
    if (dateFilter === "today" || dateFilter === "upcoming") {
      const now = DateTime.now().setZone("Asia/Kolkata");
      const todayStart = now.startOf("day").toJSDate();
      const tomorrowStart = now.plus({ days: 1 }).startOf("day").toJSDate();

      if (dateFilter === "today") {
        where.preferredDateTime = { gte: todayStart, lt: tomorrowStart };
      } else {
        // upcoming = tomorrow onward, non-cancelled
        where.preferredDateTime = { gte: tomorrowStart };
        where.status = { not: "CANCELLED" as AppointmentStatus };
      }
    }

    if (statusFilter) {
      where.status = statusFilter as AppointmentStatus;
    }

    if (typeFilter) {
      where.type = typeFilter as AppointmentType;
    }

    if (q) {
      where.OR = [
        { patient: { name: { contains: q, mode: "insensitive" } } },
        { patient: { phone: { contains: q } } },
        { patient: { patientId: { contains: q, mode: "insensitive" } } },
      ];
    }

    const appointments = await prisma.appointment.findMany({
      where,
      include: {
        patient: true,
        // Only fetch prescription ID — the list view just needs to know if one exists
        prescription: { select: { id: true, prescriptionId: true } },
        doctor: { select: { id: true, name: true, qualifications: true } },
      },
      orderBy,
    });

    // Serialize dates
    const serialized = appointments.map((a) => ({
      ...a,
      createdAt: a.createdAt.toISOString(),
      updatedAt: a.updatedAt.toISOString(),
      preferredDateTime: a.preferredDateTime.toISOString(),
      patient: {
        ...a.patient,
        createdAt: a.patient.createdAt.toISOString(),
        updatedAt: a.patient.updatedAt.toISOString(),
        dateOfBirth: a.patient.dateOfBirth?.toISOString() ?? null,
      },
      // Only id + prescriptionId are selected — no date serialization needed
      prescription: a.prescription ?? null,
      doctor: a.doctor ?? null,
    }));

    return NextResponse.json({ success: true, appointments: serialized });
  } catch (error) {
    console.error("GET /api/appointments/list error:", error);
    return NextResponse.json(
      { success: false, error: "An unexpected error occurred." },
      { status: 500 }
    );
  }
}
