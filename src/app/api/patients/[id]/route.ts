import { NextRequest, NextResponse } from "next/server";
import { z } from "zod/v4";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { patchPatientSchema } from "@/lib/validations/appointment";
import { normalizePhoneNumber } from "@/lib/utils/phone";

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

    // Find patient
    const existing = await prisma.patient.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { success: false, error: "Patient not found" },
        { status: 404 }
      );
    }

    // Validate body
    const body = await request.json();
    const parsed = patchPatientSchema.safeParse(body);

    if (!parsed.success) {
      const errors = z.prettifyError(parsed.error);
      return NextResponse.json(
        { success: false, error: "Validation failed", details: errors },
        { status: 400 }
      );
    }

    const data = parsed.data;

    // Build update data
    const updateData: Record<string, unknown> = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.email !== undefined) updateData.email = data.email || null;
    if (data.dateOfBirth !== undefined)
      updateData.dateOfBirth = data.dateOfBirth ?? null;
    if (data.sex !== undefined) updateData.sex = data.sex;

    // Normalize phone if provided
    if (data.phone !== undefined) {
      try {
        updateData.phone = normalizePhoneNumber(data.phone);
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Invalid phone number";
        return NextResponse.json(
          { success: false, error: message },
          { status: 400 }
        );
      }
    }

    const updated = await prisma.patient.update({
      where: { id },
      data: updateData,
    });

    const patient = {
      ...updated,
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.updatedAt.toISOString(),
      dateOfBirth: updated.dateOfBirth?.toISOString() ?? null,
    };

    return NextResponse.json({ success: true, patient });
  } catch (error) {
    console.error("PATCH /api/patients/[id] error:", error);
    return NextResponse.json(
      { success: false, error: "An unexpected error occurred." },
      { status: 500 }
    );
  }
}
