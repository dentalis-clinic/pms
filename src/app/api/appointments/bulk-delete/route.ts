import { NextRequest, NextResponse } from "next/server";
import { z } from "zod/v4";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth/require-admin";
import { bulkDeleteSchema } from "@/lib/validations/appointment";
import { validateOrigin } from "@/lib/utils/csrf";

export async function DELETE(request: NextRequest) {
  try {
    const csrfError = validateOrigin(request);
    if (csrfError) return csrfError;

    const auth = await requireAdmin();
    if (auth.error) return auth.error;

    const body = await request.json();
    const parsed = bulkDeleteSchema.safeParse(body);

    if (!parsed.success) {
      const errors = z.prettifyError(parsed.error);
      return NextResponse.json(
        { success: false, error: "Validation failed", details: errors },
        { status: 400 }
      );
    }

    const { ids } = parsed.data;

    // Delete prescriptions first (FK constraint), then appointments — atomically
    const deleted = await prisma.$transaction(async (tx) => {
      // Remove associated prescriptions
      await tx.prescription.deleteMany({
        where: { appointmentId: { in: ids } },
      });

      // Delete appointments
      const result = await tx.appointment.deleteMany({
        where: { id: { in: ids } },
      });

      return result.count;
    });

    return NextResponse.json({
      success: true,
      deleted,
    });
  } catch (error) {
    console.error("DELETE /api/appointments/bulk-delete error:", error);
    return NextResponse.json(
      { success: false, error: "An unexpected error occurred." },
      { status: 500 }
    );
  }
}
