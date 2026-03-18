import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

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

  return <>{children}</>;
}
