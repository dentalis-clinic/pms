import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { DashboardProvider } from "@/components/admin/DashboardContext";
import Sidebar from "@/components/admin/Sidebar";
import DashboardHeader from "@/components/admin/DashboardHeader";
import AppointmentSlideOver from "@/components/admin/AppointmentSlideOver";

export const dynamic = "force-dynamic";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
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

  return (
    <DashboardProvider>
      <div className="min-h-screen bg-surface-secondary">
        {children}
        <AppointmentSlideOver />
      </div>
    </DashboardProvider>
  );
}
