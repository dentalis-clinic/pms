import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { DashboardProvider } from "@/components/admin/DashboardContext";
import Sidebar from "@/components/admin/Sidebar";
import DashboardHeader from "@/components/admin/DashboardHeader";
import WalkInSlideOver from "@/components/admin/WalkInSlideOver";

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
        <Sidebar adminInfo={{ name: admin.name, email: admin.email }} />

        {/* Main content area — offset by sidebar width on desktop */}
        <div className="lg:pl-64">
          <DashboardHeader />
          <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
            {children}
          </main>
        </div>

        <WalkInSlideOver />
      </div>
    </DashboardProvider>
  );
}
