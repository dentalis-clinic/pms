import { NextRequest, NextResponse } from "next/server";
import { z } from "zod/v4";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { followUpSchema } from "@/lib/validations/appointment";

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
    const parsed = followUpSchema.safeParse(body);

    if (!parsed.success) {
      const errors = z.prettifyError(parsed.error);
      return NextResponse.json(
        { success: false, error: "Validation failed", details: errors },
        { status: 400 }
      );
    }

    const data = parsed.data;

    // Verify patient exists
    const patient = await prisma.patient.findUnique({
      where: { id: data.patientId },
    });

    if (!patient) {
      return NextResponse.json(
        { success: false, error: "Patient not found" },
        { status: 404 }
      );
    }

    // Create follow-up appointment
    const appointment = await prisma.appointment.create({
      data: {
        patientId: patient.id,
        type: "FOLLOW_UP",
        status: "TENTATIVE",
        preferredDateTime: data.preferredDateTime,
        reasonForVisit: data.reasonForVisit || null,
        submittedBy: "ADMIN",
        adminUserId: user.id,
      },
    });

    return NextResponse.json(
      {
        success: true,
        patientId: patient.patientId,
        appointmentId: appointment.id,
        preferredDateTime: appointment.preferredDateTime.toISOString(),
        message: "Follow-up appointment created.",
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("POST /api/appointments/follow-up error:", error);
    return NextResponse.json(
      { success: false, error: "An unexpected error occurred." },
      { status: 500 }
    );
  }
}
