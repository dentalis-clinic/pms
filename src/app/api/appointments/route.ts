import { NextRequest, NextResponse } from "next/server";
import { z } from "zod/v4";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import {
  publicBookingSchema,
  walkInSchema,
} from "@/lib/validations/appointment";
import { normalizePhoneNumber } from "@/lib/utils/phone";
import { findOrCreatePatient } from "@/lib/utils/patient-id";
import { checkRateLimit } from "@/lib/utils/rate-limit";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Detect submission type via Supabase session
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const isAdminSubmission = !!user && body.submittedByAdmin === true;

    // Rate limit (public submissions only)
    if (!isAdminSubmission) {
      const ip =
        request.headers.get("x-forwarded-for")?.split(",")[0].trim() ??
        "unknown";
      const { allowed, remaining } = checkRateLimit(ip);

      if (!allowed) {
        return NextResponse.json(
          {
            success: false,
            error: "Too many submissions. Please try again later.",
          },
          {
            status: 429,
            headers: { "X-RateLimit-Remaining": remaining.toString() },
          }
        );
      }
    }

    // Validate with appropriate schema
    const schema = isAdminSubmission ? walkInSchema : publicBookingSchema;
    const parsed = schema.safeParse(body);

    if (!parsed.success) {
      const errors = z.prettifyError(parsed.error);
      return NextResponse.json(
        { success: false, error: "Validation failed", details: errors },
        { status: 400 }
      );
    }

    const data = parsed.data;

    // Normalize phone number
    let normalizedPhone: string;
    try {
      normalizedPhone = normalizePhoneNumber(data.phone);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Invalid phone number";
      return NextResponse.json(
        { success: false, error: message },
        { status: 400 }
      );
    }

    // Duplicate detection: same phone + name with appointment in last 5 minutes
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    const recentAppointment = await prisma.appointment.findFirst({
      where: {
        createdAt: { gte: fiveMinutesAgo },
        patient: {
          phone: normalizedPhone,
          name: { equals: data.name, mode: "insensitive" },
        },
      },
      include: { patient: true },
    });

    if (recentAppointment) {
      return NextResponse.json(
        {
          success: false,
          error:
            "A booking with this name and phone was submitted recently. Please wait a few minutes before trying again.",
          patientId: recentAppointment.patient.patientId,
        },
        { status: 409 }
      );
    }

    // Find or create patient
    const fullData = data as typeof data & {
      email?: string;
      dateOfBirth?: Date;
      reasonForVisit?: string;
    };

    const { patientId, patient } = await findOrCreatePatient(prisma, {
      name: data.name,
      phone: normalizedPhone,
      email: fullData.email || null,
      dateOfBirth: fullData.dateOfBirth || null,
    });

    // Create appointment
    const appointment = await prisma.appointment.create({
      data: {
        patientId: patient.id,
        type: isAdminSubmission ? "WALK_IN" : "PATIENT_BOOKING",
        status: "TENTATIVE",
        preferredDateTime: data.preferredDateTime,
        reasonForVisit: fullData.reasonForVisit || null,
        submittedBy: isAdminSubmission ? "ADMIN" : "PATIENT",
        adminUserId: isAdminSubmission ? user!.id : null,
      },
    });

    return NextResponse.json(
      {
        success: true,
        patientId,
        appointmentId: appointment.id,
        preferredDateTime: appointment.preferredDateTime.toISOString(),
        message: isAdminSubmission
          ? "Walk-in appointment created."
          : "Your appointment has been tentatively booked.",
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("POST /api/appointments error:", error);
    return NextResponse.json(
      { success: false, error: "An unexpected error occurred." },
      { status: 500 }
    );
  }
}
