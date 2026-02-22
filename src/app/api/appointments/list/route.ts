import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
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

    // Query params
    const { searchParams } = request.nextUrl;
    const q = searchParams.get("q")?.trim() ?? "";
    const sortBy = searchParams.get("sortBy") ?? "createdAt";
    const sortOrder = searchParams.get("sortOrder") === "asc" ? "ASC" : "DESC";

    // Whitelist sortable columns to prevent SQL injection
    const allowedSortColumns: Record<string, string> = {
      createdAt: '"createdAt"',
      name: '"name"',
      phone: '"phone"',
      patientId: '"patientId"',
      preferredDateTime: '"preferredDateTime"',
      isComplete: '"isComplete"',
    };

    const sortColumn = allowedSortColumns[sortBy] ?? '"createdAt"';
    const orderByClause = Prisma.raw(`${sortColumn} ${sortOrder}`);

    // Build query with window function for phone grouping
    let patients;
    if (q) {
      const searchPattern = `%${q}%`;
      patients = await prisma.$queryRaw`
        SELECT *,
          COUNT(*) OVER (PARTITION BY phone)::int AS "phoneCount"
        FROM patients
        WHERE name ILIKE ${searchPattern}
          OR phone ILIKE ${searchPattern}
          OR "patientId" ILIKE ${searchPattern}
        ORDER BY ${orderByClause}
      `;
    } else {
      patients = await prisma.$queryRaw`
        SELECT *,
          COUNT(*) OVER (PARTITION BY phone)::int AS "phoneCount"
        FROM patients
        ORDER BY ${orderByClause}
      `;
    }

    // Serialize dates to ISO strings
    const serialized = (patients as Record<string, unknown>[]).map((p) => ({
      ...p,
      createdAt: p.createdAt instanceof Date ? p.createdAt.toISOString() : p.createdAt,
      updatedAt: p.updatedAt instanceof Date ? p.updatedAt.toISOString() : p.updatedAt,
      preferredDateTime:
        p.preferredDateTime instanceof Date
          ? p.preferredDateTime.toISOString()
          : p.preferredDateTime,
      dateOfBirth:
        p.dateOfBirth instanceof Date
          ? p.dateOfBirth.toISOString()
          : p.dateOfBirth,
    }));

    return NextResponse.json({ success: true, patients: serialized });
  } catch (error) {
    console.error("GET /api/appointments/list error:", error);
    return NextResponse.json(
      { success: false, error: "An unexpected error occurred." },
      { status: 500 }
    );
  }
}
