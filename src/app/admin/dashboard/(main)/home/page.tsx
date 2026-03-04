import { fetchDashboardStats, fetchAppointments } from "@/lib/data/dashboard";
import DashboardHome from "@/components/admin/DashboardHome";

export default async function HomePage() {
  // Fetch in parallel — no HTTP overhead, no re-auth (layout already verified)
  const [stats, appointments] = await Promise.all([
    fetchDashboardStats(),
    fetchAppointments("today"),
  ]);

  return <DashboardHome initialStats={stats} initialAppointments={appointments} />;
}
