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
  // Use getSession() (reads cookie, no network call) instead of getUser()
  // (network call to Supabase). Safe because middleware already verified the
  // session via getUser() and refreshed the cookie on this same request.
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.user) {
    redirect("/admin/login");
  }

  const admin = await prisma.admin.findUnique({ where: { id: session.user.id } });
  if (!admin) {
    redirect("/admin/login");
  }

  return (
    <DashboardProvider adminId={admin.id}>
      <div className="min-h-screen bg-surface-secondary">
        <Sidebar adminInfo={{ name: admin.name, email: admin.email }} />
        <div className="lg:pl-64">
          <DashboardHeader />
          <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
            {children}
          </main>
        </div>
        <AppointmentSlideOver />
      </div>
    </DashboardProvider>
  );
}
