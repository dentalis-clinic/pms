import { NextRequest, NextResponse } from "next/server";
import { env } from "@/env";

/**
 * Verify the cron secret from the Authorization header.
 * Vercel sends `Authorization: Bearer <CRON_SECRET>` for scheduled cron jobs.
 * Returns null if valid, or a 401 NextResponse if invalid.
 */
export function requireCronSecret(request: NextRequest): NextResponse | null {
  // If no CRON_SECRET is configured, allow in development only
  if (!env.CRON_SECRET) {
    if (env.NODE_ENV === "development") return null;
    return NextResponse.json(
      { success: false, error: "CRON_SECRET not configured." },
      { status: 500 }
    );
  }

  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${env.CRON_SECRET}`) {
    return NextResponse.json(
      { success: false, error: "Unauthorized." },
      { status: 401 }
    );
  }

  return null;
}
