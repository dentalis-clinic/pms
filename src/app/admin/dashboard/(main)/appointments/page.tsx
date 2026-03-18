import { fetchAppointments } from "@/lib/data/dashboard";
import AppointmentsView from "@/components/admin/AppointmentsView";

export default async function AppointmentsPage() {
  // Fetch all appointments server-side; tab filtering happens client-side in memory
  const appointments = await fetchAppointments("all");
  return <AppointmentsView initialAppointments={appointments} />;
}
