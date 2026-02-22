import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import DashboardClient from "./DashboardClient";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  // Auth check: verify Supabase session + admin table
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/admin/login");
  }

  const admin = await prisma.admin.findUnique({ where: { id: user.id } });
  if (!admin) {
    redirect("/admin/login");
  }

  return <DashboardClient adminName={admin.name} />;
}
