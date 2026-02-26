import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { normalizePhoneNumber } from "@/lib/utils/phone";

export async function GET(request: NextRequest) {
  try {
    // Auth check — admin only
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

    const searchParams = request.nextUrl.searchParams;
    const phone = searchParams.get("phone");

    if (!phone) {
      return NextResponse.json(
        { success: false, error: "Phone number is required" },
        { status: 400 }
      );
    }

    let normalizedPhone: string;
    try {
      normalizedPhone = normalizePhoneNumber(phone);
    } catch {
      return NextResponse.json({ success: true, patients: [] });
    }

    const patients = await prisma.patient.findMany({
      where: { phone: normalizedPhone },
      select: {
        id: true,
        patientId: true,
        name: true,
        sex: true,
        email: true,
        dateOfBirth: true,
        appointments: {
          orderBy: { preferredDateTime: "desc" },
          take: 1,
          select: { preferredDateTime: true },
        },
      },
    });

    const result = patients.map((p) => ({
      id: p.id,
      patientId: p.patientId,
      name: p.name,
      sex: p.sex,
      email: p.email,
      dateOfBirth: p.dateOfBirth?.toISOString() ?? null,
      lastVisitDate:
        p.appointments.length > 0
          ? p.appointments[0].preferredDateTime.toISOString()
          : null,
    }));

    return NextResponse.json({ success: true, patients: result });
  } catch (error) {
    console.error("Patient lookup error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to lookup patients" },
      { status: 500 }
    );
  }
}
