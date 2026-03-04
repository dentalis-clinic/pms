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
    const pageParam = Number.parseInt(searchParams.get("page") ?? "1", 10);
    const pageSizeParam = Number.parseInt(
      searchParams.get("pageSize") ?? "50",
      10
    );
    const page = Number.isFinite(pageParam) && pageParam > 0 ? pageParam : 1;
    const pageSize =
      Number.isFinite(pageSizeParam) && pageSizeParam > 0
        ? Math.min(pageSizeParam, 200)
        : 50;
    const usePagination =
      searchParams.has("page") || searchParams.has("pageSize");

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

    const rows = await prisma.appointment.findMany({
      where,
      select: {
        id: true,
        patientId: true,
        type: true,
        bookingChannel: true,
        visitType: true,
        priority: true,
        status: true,
        preferredDateTime: true,
        reasonForVisit: true,
        submittedBy: true,
        adminUserId: true,
        notes: true,
        createdAt: true,
        updatedAt: true,
        patient: {
          select: {
            id: true,
            patientId: true,
            name: true,
            phone: true,
            email: true,
            dateOfBirth: true,
            sex: true,
            createdAt: true,
            updatedAt: true,
          },
        },
        // Only fetch prescription ID — the list view just needs to know if one exists
        prescription: { select: { id: true, prescriptionId: true } },
      },
      orderBy,
      ...(usePagination
        ? {
            skip: (page - 1) * pageSize,
            take: pageSize + 1, // fetch one extra row to compute hasMore
          }
        : {}),
    });

    const hasMore = usePagination && rows.length > pageSize;
    const appointments = usePagination ? rows.slice(0, pageSize) : rows;

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
    }));

    return NextResponse.json({
      success: true,
      appointments: serialized,
      pagination: usePagination
        ? {
            page,
            pageSize,
            hasMore,
          }
        : null,
    });
  } catch (error) {
    console.error("GET /api/appointments/list error:", error);
    return NextResponse.json(
      { success: false, error: "An unexpected error occurred." },
      { status: 500 }
    );
  }
}
