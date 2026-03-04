import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import type { User } from "@supabase/supabase-js";

interface Admin {
  id: string;
  email: string;
  name: string;
  createdAt: Date;
  updatedAt: Date;
}

type RequireAdminSuccess = { admin: Admin; user: User; error: null };
type RequireAdminError = { admin: null; user: null; error: NextResponse };

type RequireAdminResult = RequireAdminSuccess | RequireAdminError;

/**
 * Authenticate and authorize the current request as an admin user.
 * Returns the admin and Supabase user on success, or a ready-to-return
 * NextResponse on failure (401 or 403).
 */
export async function requireAdmin(): Promise<RequireAdminResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      admin: null,
      user: null,
      error: NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      ),
    };
  }

  const admin = await prisma.admin.findUnique({ where: { id: user.id } });
  if (!admin) {
    return {
      admin: null,
      user: null,
      error: NextResponse.json(
        { success: false, error: "Forbidden" },
        { status: 403 }
      ),
    };
  }

  return { admin, user, error: null };
}
