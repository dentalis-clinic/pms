import { NextRequest, NextResponse } from "next/server";
import { env } from "@/env";

/**
 * Validate that the request origin matches the app host.
 * Returns null if valid, or a 403 NextResponse if invalid.
 *
 * Should be called on all state-mutating (POST/PATCH/DELETE) requests.
 * GET requests are safe and don't need CSRF validation.
 */
export function validateOrigin(request: NextRequest): NextResponse | null {
  const method = request.method.toUpperCase();
  if (method === "GET" || method === "HEAD" || method === "OPTIONS") {
    return null; // Safe methods don't need CSRF validation
  }

  const origin = request.headers.get("origin");
  const referer = request.headers.get("referer");
  const source = origin || referer;

  if (!source) {
    // No origin header — could be a server-to-server call or same-origin
    // Be lenient for now (strict mode can reject these)
    return null;
  }

  try {
    const sourceUrl = new URL(source);
    const appUrl = new URL(env.NEXT_PUBLIC_SUPABASE_URL);
    const appHost = request.headers.get("host") || appUrl.host;

    // Allow requests from same host
    if (sourceUrl.host === appHost) {
      return null;
    }

    // Also allow localhost in development
    if (
      env.NODE_ENV === "development" &&
      (sourceUrl.hostname === "localhost" || sourceUrl.hostname === "127.0.0.1")
    ) {
      return null;
    }
  } catch {
    // Malformed URL — reject
  }

  return NextResponse.json(
    { success: false, error: "Invalid request origin." },
    { status: 403 }
  );
}
