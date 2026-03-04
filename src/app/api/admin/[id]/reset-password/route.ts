import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth/require-admin";
import { env } from "@/env";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAdmin();
    if (auth.error) return auth.error;

    const { id } = await params;

    const target = await prisma.admin.findUnique({ where: { id } });
    if (!target) {
      return NextResponse.json(
        { success: false, error: "Admin not found." },
        { status: 404 }
      );
    }

    const supabaseAdmin = createClient(
      env.NEXT_PUBLIC_SUPABASE_URL,
      env.SUPABASE_SERVICE_ROLE_KEY,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    const { error } = await supabaseAdmin.auth.resetPasswordForEmail(
      target.email
    );

    if (error) {
      console.error("Password reset error:", error.message);
      return NextResponse.json(
        { success: false, error: "Failed to send password reset email." },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Password reset email sent.",
    });
  } catch (error) {
    console.error("POST /api/admin/[id]/reset-password error:", error);
    return NextResponse.json(
      { success: false, error: "An unexpected error occurred." },
      { status: 500 }
    );
  }
}
