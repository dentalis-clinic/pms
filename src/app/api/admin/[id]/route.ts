import { NextRequest, NextResponse } from "next/server";
import { z } from "zod/v4";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { createClient } from "@supabase/supabase-js";
import { prisma } from "@/lib/prisma";
import { env } from "@/env";

const patchAdminSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(100).optional(),
  email: z.string().trim().email("Invalid email address").optional(),
});

// --- PATCH: Update admin name/email ---
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const currentAdmin = await prisma.admin.findUnique({
      where: { id: user.id },
    });
    if (!currentAdmin) {
      return NextResponse.json(
        { success: false, error: "Forbidden" },
        { status: 403 }
      );
    }

    const { id } = await params;

    const body = await request.json();
    const parsed = patchAdminSchema.safeParse(body);

    if (!parsed.success) {
      const errors = z.prettifyError(parsed.error);
      return NextResponse.json(
        { success: false, error: "Validation failed", details: errors },
        { status: 400 }
      );
    }

    const { name, email } = parsed.data;

    if (!name && !email) {
      return NextResponse.json(
        { success: false, error: "No fields to update." },
        { status: 400 }
      );
    }

    const target = await prisma.admin.findUnique({ where: { id } });
    if (!target) {
      return NextResponse.json(
        { success: false, error: "Admin not found." },
        { status: 404 }
      );
    }

    // If email changes, check for duplicates and update Supabase auth
    if (email && email !== target.email) {
      const duplicate = await prisma.admin.findUnique({ where: { email } });
      if (duplicate) {
        return NextResponse.json(
          { success: false, error: "An admin with this email already exists." },
          { status: 409 }
        );
      }

      const supabaseAdmin = createClient(
        env.NEXT_PUBLIC_SUPABASE_URL,
        env.SUPABASE_SERVICE_ROLE_KEY,
        { auth: { autoRefreshToken: false, persistSession: false } }
      );

      const { error: authError } =
        await supabaseAdmin.auth.admin.updateUserById(id, { email });

      if (authError) {
        return NextResponse.json(
          { success: false, error: `Auth error: ${authError.message}` },
          { status: 400 }
        );
      }
    }

    const updated = await prisma.admin.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(email && email !== target.email && { email }),
      },
    });

    return NextResponse.json({
      success: true,
      admin: {
        id: updated.id,
        name: updated.name,
        email: updated.email,
      },
    });
  } catch (error) {
    console.error("PATCH /api/admin/[id] error:", error);
    return NextResponse.json(
      { success: false, error: "An unexpected error occurred." },
      { status: 500 }
    );
  }
}

// --- DELETE: Remove admin ---
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const currentAdmin = await prisma.admin.findUnique({
      where: { id: user.id },
    });
    if (!currentAdmin) {
      return NextResponse.json(
        { success: false, error: "Forbidden" },
        { status: 403 }
      );
    }

    const { id } = await params;

    // Cannot delete yourself
    if (user.id === id) {
      return NextResponse.json(
        { success: false, error: "You cannot delete your own account." },
        { status: 400 }
      );
    }

    // Cannot delete last admin
    const adminCount = await prisma.admin.count();
    if (adminCount <= 1) {
      return NextResponse.json(
        { success: false, error: "Cannot delete the last admin." },
        { status: 400 }
      );
    }

    const target = await prisma.admin.findUnique({ where: { id } });
    if (!target) {
      return NextResponse.json(
        { success: false, error: "Admin not found." },
        { status: 404 }
      );
    }

    // Check if admin has prescribed any treatments
    const prescriptionCount = await prisma.prescription.count({
      where: { prescribedById: id },
    });
    if (prescriptionCount > 0) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Cannot delete admin who has prescribed treatments. Reassign prescriptions first.",
        },
        { status: 409 }
      );
    }

    // Delete from Prisma first, then Supabase auth
    await prisma.admin.delete({ where: { id } });

    const supabaseAdmin = createClient(
      env.NEXT_PUBLIC_SUPABASE_URL,
      env.SUPABASE_SERVICE_ROLE_KEY,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );
    await supabaseAdmin.auth.admin.deleteUser(id);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/admin/[id] error:", error);
    return NextResponse.json(
      { success: false, error: "An unexpected error occurred." },
      { status: 500 }
    );
  }
}
