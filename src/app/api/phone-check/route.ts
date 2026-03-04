import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { normalizePhoneNumber } from "@/lib/utils/phone";
import { maskName } from "@/lib/utils/mask-name";
import { checkRateLimit } from "@/lib/utils/rate-limit";
import { generatePatientToken } from "@/lib/utils/patient-token";
import type { PhoneCheckStatus, MaskedPatient } from "@/types/patient";

const PHONE_CHECK_RATE_LIMIT = 10;

export async function GET(request: NextRequest) {
  try {
    // Rate limit: 10 checks per IP per hour
    const ip =
      request.headers.get("x-real-ip") ??
      request.headers.get("x-forwarded-for")?.split(",")[0].trim() ??
      "unknown";
    const { allowed } = await checkRateLimit(ip, {
      namespace: "phone-check",
      max: PHONE_CHECK_RATE_LIMIT,
    });

    if (!allowed) {
      return NextResponse.json(
        { success: false, error: "Too many requests. Please try again later." },
        { status: 429 }
      );
    }

    const phone = request.nextUrl.searchParams.get("phone");
    if (!phone) {
      return NextResponse.json({
        success: true,
        status: "new" as PhoneCheckStatus,
        patients: [],
      });
    }

    // Normalize — invalid phones return "new" (don't leak validation info)
    let normalizedPhone: string;
    try {
      normalizedPhone = normalizePhoneNumber(phone);
    } catch {
      return NextResponse.json({
        success: true,
        status: "new" as PhoneCheckStatus,
        patients: [],
      });
    }

    // Query patients + their latest TENTATIVE appointment (future only)
    const patients = await prisma.patient.findMany({
      where: { phone: normalizedPhone },
      select: {
        id: true,
        name: true,
        appointments: {
          where: {
            status: "TENTATIVE",
            preferredDateTime: { gt: new Date() },
          },
          orderBy: { preferredDateTime: "desc" },
          take: 1,
          select: { preferredDateTime: true },
        },
      },
    });

    if (patients.length === 0) {
      // Anti-enumeration: add random jitter (200-400ms)
      await delay(200 + Math.random() * 200);
      return NextResponse.json({
        success: true,
        status: "new" as PhoneCheckStatus,
        patients: [],
      });
    }

    const maskedPatients: MaskedPatient[] = patients.map((p) => {
      const hasPending = p.appointments.length > 0;
      return {
        id: generatePatientToken(p.id), // Opaque token instead of UUID
        maskedName: maskName(p.name),
        hasPending,
        pendingDate: hasPending
          ? p.appointments[0].preferredDateTime.toISOString()
          : null,
      };
    });

    const hasAnyPending = maskedPatients.some((p) => p.hasPending);
    const status: PhoneCheckStatus = hasAnyPending
      ? "has_pending"
      : "existing";

    // Anti-enumeration jitter
    await delay(200 + Math.random() * 200);

    return NextResponse.json({
      success: true,
      status,
      patients: maskedPatients,
    });
  } catch (error) {
    console.error("GET /api/phone-check error:", error);
    return NextResponse.json(
      { success: false, error: "An unexpected error occurred." },
      { status: 500 }
    );
  }
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
