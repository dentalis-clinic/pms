import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import type {
  AppointmentStatus,
  AppointmentType,
} from "@/generated/prisma/client";

export async function GET(request: NextRequest) {
  try {
    // Auth check
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

    // Query params
    const { searchParams } = request.nextUrl;
    const q = searchParams.get("q")?.trim() ?? "";
    const statusFilter = searchParams.get("status") ?? "";
    const typeFilter = searchParams.get("type") ?? "";
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
        prescription: true,
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
      prescription: a.prescription
        ? {
            ...a.prescription,
            createdAt: a.prescription.createdAt.toISOString(),
            updatedAt: a.prescription.updatedAt.toISOString(),
            nextVisitDate:
              a.prescription.nextVisitDate?.toISOString() ?? null,
          }
        : null,
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
