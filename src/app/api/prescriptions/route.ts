import { NextRequest, NextResponse } from "next/server";
import { z } from "zod/v4";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { prescriptionSchema } from "@/lib/validations/prescription";
import { createPrescriptionWithId } from "@/lib/utils/prescription-id";

export async function POST(request: NextRequest) {
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

    // Validate body
    const body = await request.json();
    const parsed = prescriptionSchema.safeParse(body);

    if (!parsed.success) {
      const errors = z.prettifyError(parsed.error);
      return NextResponse.json(
        { success: false, error: "Validation failed", details: errors },
        { status: 400 }
      );
    }

    const data = parsed.data;

    // Verify appointment exists and is not cancelled
    const appointment = await prisma.appointment.findUnique({
      where: { id: data.appointmentId },
      include: { prescription: true },
    });

    if (!appointment) {
      return NextResponse.json(
        { success: false, error: "Appointment not found" },
        { status: 404 }
      );
    }

    if (appointment.status === "CANCELLED") {
      return NextResponse.json(
        { success: false, error: "Cannot create prescription for a cancelled appointment." },
        { status: 400 }
      );
    }

    if (appointment.prescription) {
      return NextResponse.json(
        { success: false, error: "This appointment already has a prescription." },
        { status: 409 }
      );
    }

    // Create prescription (auto-confirms appointment inside transaction)
    const { prescriptionId, record } = await createPrescriptionWithId(prisma, {
      appointmentId: data.appointmentId,
      diagnosis: data.diagnosis,
      medications: data.medications,
      treatmentPlan: data.treatmentPlan || null,
      nextVisitDate: data.nextVisitDate || null,
      advice: data.advice || null,
      prescribedById: user.id,
    });

    return NextResponse.json(
      {
        success: true,
        prescriptionId,
        prescription: record,
        message: "Prescription created. Appointment confirmed.",
      },
      { status: 201 }
    );
  } catch (error) {
    // Handle unique constraint violation (concurrent creation)
    if (
      error instanceof Error &&
      "code" in error &&
      (error as { code: string }).code === "P2002"
    ) {
      return NextResponse.json(
        { success: false, error: "This appointment already has a prescription." },
        { status: 409 }
      );
    }

    console.error("POST /api/prescriptions error:", error);
    return NextResponse.json(
      { success: false, error: "An unexpected error occurred." },
      { status: 500 }
    );
  }
}
