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

    // Resolve patient: existing (by ID) or find-or-create (by name)
    const fullData = data as typeof data & {
      existingPatientId?: string;
      email?: string;
      dateOfBirth?: Date;
      reasonForVisit?: string;
    };

    let patientId: string;
    let patient: { id: string; patientId: string };

    if (fullData.existingPatientId) {
      // Returning patient selected from masked name list
      const existing = await prisma.patient.findUnique({
        where: { id: fullData.existingPatientId },
        select: { id: true, patientId: true, phone: true },
      });

      if (!existing || existing.phone !== normalizedPhone) {
        return NextResponse.json(
          { success: false, error: "Invalid patient selection." },
          { status: 400 }
        );
      }

      patient = { id: existing.id, patientId: existing.patientId };
      patientId = existing.patientId;

      // Duplicate detection for existing patient
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
      const recentAppointment = await prisma.appointment.findFirst({
        where: {
          createdAt: { gte: fiveMinutesAgo },
          patientId: existing.id,
        },
      });

      if (recentAppointment) {
        return NextResponse.json(
          {
            success: false,
            error:
              "A booking was submitted recently for this patient. Please wait a few minutes before trying again.",
            patientId,
          },
          { status: 409 }
        );
      }
    } else {
      // New patient or name-based matching
      if (!data.name) {
        return NextResponse.json(
          { success: false, error: "Name is required for new patients." },
          { status: 400 }
        );
      }

      // Duplicate detection: same phone + name within 5 minutes
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

      const result = await findOrCreatePatient(prisma, {
        name: data.name,
        phone: normalizedPhone,
        email: fullData.email || null,
        dateOfBirth: fullData.dateOfBirth || null,
      });

      patientId = result.patientId;
      patient = result.patient;
    }

    // Check for slot conflicts (prevent double-booking)
    const conflictingAppointment = await prisma.appointment.findFirst({
      where: {
        preferredDateTime: data.preferredDateTime,
        status: {
          in: ["TENTATIVE", "CONFIRMED", "COMPLETED"],
        },
      },
    });

    if (conflictingAppointment) {
      return NextResponse.json(
        {
          success: false,
          error: "This time slot is already booked. Please choose another time.",
          code: "SLOT_CONFLICT",
        },
        { status: 409 }
      );
    }

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
