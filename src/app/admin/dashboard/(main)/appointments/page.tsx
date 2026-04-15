import { fetchAppointments } from "@/lib/data/dashboard";
import AppointmentsView from "@/components/admin/AppointmentsView";

export default async function AppointmentsPage() {
  const { appointments, total } = await fetchAppointments("all");
  return <AppointmentsView initialAppointments={appointments} initialTotal={total} />;
}
