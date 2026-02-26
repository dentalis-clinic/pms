import { NextRequest, NextResponse } from "next/server";
import { z } from "zod/v4";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { confirmAppointmentSchema } from "@/lib/validations/appointment";
import { normalizePhoneNumber } from "@/lib/utils/phone";
import { findOrCreatePatient } from "@/lib/utils/patient-id";
import type { Sex } from "@/generated/prisma/client";

/** Valid status transitions (subset used here). */
const VALID_TRANSITIONS: Record<string, string[]> = {
  TENTATIVE: ["CONFIRMED", "CANCELLED"],
};

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

    // Validate
    const body = await request.json();
    const parsed = confirmAppointmentSchema.safeParse(body);

    if (!parsed.success) {
      const errors = z.prettifyError(parsed.error);
      return NextResponse.json(
        { success: false, error: "Validation failed", details: errors },
        { status: 400 }
      );
    }

    const data = parsed.data;

    // Normalize phone
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

    // --- Flow A: Confirm existing TENTATIVE appointment ---
    if (data.existingAppointmentId) {
      const appointment = await prisma.appointment.findUnique({
        where: { id: data.existingAppointmentId },
        include: { patient: true },
      });

      if (!appointment) {
        return NextResponse.json(
          { success: false, error: "Appointment not found" },
          { status: 404 }
        );
      }

      if (!VALID_TRANSITIONS[appointment.status]?.includes("CONFIRMED")) {
        return NextResponse.json(
          {
            success: false,
            error: `Cannot confirm appointment with status "${appointment.status}"`,
          },
          { status: 400 }
        );
      }

      // Update patient demographics
      const patientUpdates: Record<string, unknown> = {};
      if (data.name && data.name !== appointment.patient.name)
        patientUpdates.name = data.name;
      if (data.sex) patientUpdates.sex = data.sex as Sex;
      if (data.email) patientUpdates.email = data.email;
      if (data.dateOfBirth)
        patientUpdates.dateOfBirth = data.dateOfBirth;

      if (Object.keys(patientUpdates).length > 0) {
        await prisma.patient.update({
          where: { id: appointment.patient.id },
          data: patientUpdates,
        });
      }

      // Confirm the appointment
      const updated = await prisma.appointment.update({
        where: { id: appointment.id },
        data: {
          status: "CONFIRMED",
          reasonForVisit: data.reasonForVisit || appointment.reasonForVisit,
          preferredDateTime: data.preferredDateTime,
          adminUserId: admin.id,
        },
      });

      return NextResponse.json(
        {
          success: true,
          appointmentId: updated.id,
          patientId: appointment.patient.patientId,
          message: "Appointment confirmed.",
        },
        { status: 200 }
      );
    }

    // --- Flow B: New appointment for existing patient (selected from dropdown) ---
    if (data.existingPatientId) {
      const patient = await prisma.patient.findUnique({
        where: { id: data.existingPatientId },
      });

      if (!patient) {
        return NextResponse.json(
          { success: false, error: "Patient not found" },
          { status: 404 }
        );
      }

      // Update patient demographics if provided
      const patientUpdates: Record<string, unknown> = {};
      if (data.sex) patientUpdates.sex = data.sex as Sex;
      if (data.email && !patient.email) patientUpdates.email = data.email;
      if (data.dateOfBirth && !patient.dateOfBirth)
        patientUpdates.dateOfBirth = data.dateOfBirth;

      if (Object.keys(patientUpdates).length > 0) {
        await prisma.patient.update({
          where: { id: patient.id },
          data: patientUpdates,
        });
      }

      const appointmentType =
        data.visitType === "FOLLOW_UP" ? "FOLLOW_UP" : "WALK_IN";

      const appointment = await prisma.appointment.create({
        data: {
          patientId: patient.id,
          type: appointmentType,
          status: "CONFIRMED",
          preferredDateTime: data.preferredDateTime,
          reasonForVisit: data.reasonForVisit || null,
          submittedBy: "ADMIN",
          adminUserId: admin.id,
        },
      });

      return NextResponse.json(
        {
          success: true,
          appointmentId: appointment.id,
          patientId: patient.patientId,
          message: "Appointment created and confirmed.",
        },
        { status: 201 }
      );
    }

    // --- Flow C: Brand new patient ---
    const { patientId, patient } = await findOrCreatePatient(prisma, {
      name: data.name,
      phone: normalizedPhone,
      email: data.email || null,
      dateOfBirth: data.dateOfBirth || null,
      sex: (data.sex as Sex) || null,
    });

    const appointment = await prisma.appointment.create({
      data: {
        patientId: patient.id,
        type: "WALK_IN",
        status: "CONFIRMED",
        preferredDateTime: data.preferredDateTime,
        reasonForVisit: data.reasonForVisit || null,
        submittedBy: "ADMIN",
        adminUserId: admin.id,
      },
    });

    return NextResponse.json(
      {
        success: true,
        appointmentId: appointment.id,
        patientId,
        message: "Patient registered and appointment confirmed.",
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("POST /api/appointments/confirm error:", error);
    return NextResponse.json(
      { success: false, error: "An unexpected error occurred." },
      { status: 500 }
    );
  }
}
