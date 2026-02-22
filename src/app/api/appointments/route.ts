import { NextRequest, NextResponse } from "next/server";
import { z } from "zod/v4";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import {
  publicBookingSchema,
  fullPatientSchema,
} from "@/lib/validations/appointment";
import { normalizePhoneNumber } from "@/lib/utils/phone";
import { createPatientWithId } from "@/lib/utils/patient-id";
import { checkRateLimit } from "@/lib/utils/rate-limit";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Detect submission type: check Supabase session
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
            error:
              "Too many submissions. Please try again later.",
          },
          {
            status: 429,
            headers: { "X-RateLimit-Remaining": remaining.toString() },
          }
        );
      }
    }

    // Validate with appropriate schema
    const schema = isAdminSubmission ? fullPatientSchema : publicBookingSchema;
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

    // Duplicate detection: same phone + name within 5 minutes
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    const duplicate = await prisma.patient.findFirst({
      where: {
        phone: normalizedPhone,
        name: { equals: data.name, mode: "insensitive" },
        createdAt: { gte: fiveMinutesAgo },
      },
    });

    if (duplicate) {
      return NextResponse.json(
        {
          success: false,
          error:
            "A booking with this name and phone was submitted recently. Please wait a few minutes before trying again.",
          patientId: duplicate.patientId,
        },
        { status: 409 }
      );
    }

    // Build patient data
    const patientData: Record<string, unknown> = {
      name: data.name,
      phone: normalizedPhone,
      preferredDateTime: data.preferredDateTime,
      submittedBy: isAdminSubmission ? "ADMIN" : "PATIENT",
      isComplete: false,
    };

    if (isAdminSubmission) {
      patientData.adminUserId = user.id;
      // fullPatientSchema data has additional fields
      const fullData = data as typeof data & {
        email?: string;
        dateOfBirth?: Date;
        reasonForVisit?: string;
      };
      if (fullData.email) patientData.email = fullData.email;
      if (fullData.dateOfBirth) patientData.dateOfBirth = fullData.dateOfBirth;
      if (fullData.reasonForVisit)
        patientData.reasonForVisit = fullData.reasonForVisit;

      // Mark complete if all optional fields are filled
      patientData.isComplete = !!(
        fullData.email &&
        fullData.dateOfBirth &&
        fullData.reasonForVisit
      );
    }

    // Create patient with generated ID
    const { patientId } = await createPatientWithId(prisma, patientData);

    return NextResponse.json(
      {
        success: true,
        patientId,
        message: isAdminSubmission
          ? "Patient record created successfully."
          : "Appointment request submitted! Please save your Patient ID.",
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
