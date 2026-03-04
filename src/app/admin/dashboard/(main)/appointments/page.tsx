import AppointmentsView from "@/components/admin/AppointmentsView";

export default function AppointmentsPage() {
  // Let the client fetch paginated data per tab for faster first load.
  return <AppointmentsView initialTab="today" />;
}
