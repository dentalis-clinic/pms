import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";

export async function GET(
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

    // Support lookup by UUID or prescriptionId (RX-...)
    const isRxId = id.startsWith("RX-");
    const prescription = await prisma.prescription.findUnique({
      where: isRxId ? { prescriptionId: id } : { id },
      include: {
        appointment: {
          include: { patient: true },
        },
        prescribedBy: { select: { id: true, name: true, email: true } },
      },
    });

    if (!prescription) {
      return NextResponse.json(
        { success: false, error: "Prescription not found" },
        { status: 404 }
      );
    }

    // Serialize dates
    const serialized = {
      ...prescription,
      createdAt: prescription.createdAt.toISOString(),
      updatedAt: prescription.updatedAt.toISOString(),
      nextVisitDate: prescription.nextVisitDate?.toISOString() ?? null,
      appointment: {
        ...prescription.appointment,
        createdAt: prescription.appointment.createdAt.toISOString(),
        updatedAt: prescription.appointment.updatedAt.toISOString(),
        preferredDateTime:
          prescription.appointment.preferredDateTime.toISOString(),
        patient: {
          ...prescription.appointment.patient,
          createdAt:
            prescription.appointment.patient.createdAt.toISOString(),
          updatedAt:
            prescription.appointment.patient.updatedAt.toISOString(),
          dateOfBirth:
            prescription.appointment.patient.dateOfBirth?.toISOString() ??
            null,
        },
      },
    };

    return NextResponse.json({ success: true, prescription: serialized });
  } catch (error) {
    console.error("GET /api/prescriptions/[id] error:", error);
    return NextResponse.json(
      { success: false, error: "An unexpected error occurred." },
      { status: 500 }
    );
  }
}
