import { NextRequest, NextResponse } from "next/server";
import { z } from "zod/v4";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { patchAppointmentSchema } from "@/lib/validations/appointment";
import type { AppointmentStatus } from "@/generated/prisma/client";

/** Valid status transitions — terminal states have no outgoing edges. */
const VALID_TRANSITIONS: Record<AppointmentStatus, AppointmentStatus[]> = {
  TENTATIVE: ["CONFIRMED", "CANCELLED"],
  CONFIRMED: ["COMPLETED", "CANCELLED"],
  COMPLETED: [],
  CANCELLED: [],
};

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

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

    // Find appointment
    const existing = await prisma.appointment.findUnique({
      where: { id },
      include: { patient: true },
    });
    if (!existing) {
      return NextResponse.json(
        { success: false, error: "Appointment not found" },
        { status: 404 }
      );
    }

    // Validate body
    const body = await request.json();
    const parsed = patchAppointmentSchema.safeParse(body);

    if (!parsed.success) {
      const errors = z.prettifyError(parsed.error);
      return NextResponse.json(
        { success: false, error: "Validation failed", details: errors },
        { status: 400 }
      );
    }

    const data = parsed.data;

    // Enforce valid status transitions
    if (data.status) {
      const allowed = VALID_TRANSITIONS[existing.status];
      if (!allowed.includes(data.status as AppointmentStatus)) {
        return NextResponse.json(
          {
            success: false,
            error: `Cannot transition from ${existing.status} to ${data.status}.`,
          },
          { status: 400 }
        );
      }
    }

    // Build update data
    const updateData: Record<string, unknown> = {};
    if (data.status !== undefined) updateData.status = data.status;
    if (data.reasonForVisit !== undefined)
      updateData.reasonForVisit = data.reasonForVisit || null;
    if (data.notes !== undefined) updateData.notes = data.notes || null;
    if (data.preferredDateTime !== undefined)
      updateData.preferredDateTime = data.preferredDateTime;

    const updated = await prisma.appointment.update({
      where: { id },
      data: updateData,
      include: { patient: true, prescription: true },
    });

    // Serialize dates
    const appointment = {
      ...updated,
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.updatedAt.toISOString(),
      preferredDateTime: updated.preferredDateTime.toISOString(),
      patient: {
        ...updated.patient,
        createdAt: updated.patient.createdAt.toISOString(),
        updatedAt: updated.patient.updatedAt.toISOString(),
        dateOfBirth: updated.patient.dateOfBirth?.toISOString() ?? null,
      },
      prescription: updated.prescription
        ? {
            ...updated.prescription,
            createdAt: updated.prescription.createdAt.toISOString(),
            updatedAt: updated.prescription.updatedAt.toISOString(),
            nextVisitDate:
              updated.prescription.nextVisitDate?.toISOString() ?? null,
          }
        : null,
    };

    return NextResponse.json({ success: true, appointment });
  } catch (error) {
    console.error("PATCH /api/appointments/[id] error:", error);
    return NextResponse.json(
      { success: false, error: "An unexpected error occurred." },
      { status: 500 }
    );
  }
}
