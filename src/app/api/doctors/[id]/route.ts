import { NextRequest, NextResponse } from "next/server";
import { z } from "zod/v4";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth/require-admin";
import { validateOrigin } from "@/lib/utils/csrf";

const patchDoctorSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(200).optional(),
  qualifications: z.string().trim().max(500).optional(),
  registrationNumber: z.string().trim().max(100).optional(),
  isActive: z.boolean().optional(),
});

// --- PATCH: Update doctor ---
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const csrfError = validateOrigin(request);
    if (csrfError) return csrfError;

    const auth = await requireAdmin();
    if (auth.error) return auth.error;

    const { id } = await params;

    const body = await request.json();
    const parsed = patchDoctorSchema.safeParse(body);

    if (!parsed.success) {
      const errors = z.prettifyError(parsed.error);
      return NextResponse.json(
        { success: false, error: "Validation failed", details: errors },
        { status: 400 }
      );
    }

    const { name, qualifications, registrationNumber, isActive } = parsed.data;

    if (!name && !qualifications && registrationNumber === undefined && isActive === undefined) {
      return NextResponse.json(
        { success: false, error: "No fields to update." },
        { status: 400 }
      );
    }

    const target = await prisma.doctor.findUnique({ where: { id } });
    if (!target) {
      return NextResponse.json(
        { success: false, error: "Doctor not found." },
        { status: 404 }
      );
    }

    const updated = await prisma.doctor.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(qualifications !== undefined && {
          qualifications: qualifications || null,
        }),
        ...(registrationNumber !== undefined && {
          registrationNumber: registrationNumber || null,
        }),
        ...(isActive !== undefined && { isActive }),
      },
    });

    return NextResponse.json({
      success: true,
      doctor: {
        id: updated.id,
        name: updated.name,
        qualifications: updated.qualifications,
        registrationNumber: updated.registrationNumber,
        isActive: updated.isActive,
        createdAt: updated.createdAt.toISOString(),
        updatedAt: updated.updatedAt.toISOString(),
      },
    });
  } catch (error) {
    console.error("PATCH /api/doctors/[id] error:", error);
    return NextResponse.json(
      { success: false, error: "An unexpected error occurred." },
      { status: 500 }
    );
  }
}

// --- DELETE: Soft-delete doctor (or hard-delete if no appointments) ---
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const csrfError = validateOrigin(request);
    if (csrfError) return csrfError;

    const auth = await requireAdmin();
    if (auth.error) return auth.error;

    const { id } = await params;

    const target = await prisma.doctor.findUnique({ where: { id } });
    if (!target) {
      return NextResponse.json(
        { success: false, error: "Doctor not found." },
        { status: 404 }
      );
    }

    // Check if doctor has any appointments
    const appointmentCount = await prisma.appointment.count({
      where: { doctorId: id },
    });

    if (appointmentCount > 0) {
      // Soft-delete: keep record for historical appointments
      await prisma.doctor.update({
        where: { id },
        data: { isActive: false },
      });
    } else {
      // No references: safe to hard-delete
      await prisma.doctor.delete({ where: { id } });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/doctors/[id] error:", error);
    return NextResponse.json(
      { success: false, error: "An unexpected error occurred." },
      { status: 500 }
    );
  }
}
