import { fetchAppointments } from "@/lib/data/dashboard";
import AppointmentsView from "@/components/admin/AppointmentsView";

export default async function AppointmentsPage() {
  const appointments = await fetchAppointments("today");
  return <AppointmentsView initialAppointments={appointments} />;
}
