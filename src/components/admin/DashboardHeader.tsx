"use client";

import { usePathname } from "next/navigation";
import { useDashboard } from "./DashboardContext";
import { Button } from "@/components/ui";

const pageTitles: Record<string, string> = {
  "/admin/dashboard/home": "Dashboard",
  "/admin/dashboard/appointments": "Appointments",
  "/admin/dashboard/settings": "Settings",
};

export default function DashboardHeader() {
  const pathname = usePathname();
  const { toggleSidebar, openNewAppointment } = useDashboard();

  const title = pageTitles[pathname] ?? "Dashboard";

  return (
    <header className="flex h-14 items-center justify-between border-b border-border-primary bg-surface-primary px-4">
      <div className="flex items-center gap-3">
        {/* Mobile hamburger */}
        <button
          type="button"
          onClick={toggleSidebar}
          className="rounded-md p-1.5 text-text-hint hover:bg-surface-tertiary hover:text-text-brand focus:ring-2 focus:ring-focus-ring focus:outline-none lg:hidden"
          aria-label="Toggle sidebar"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
            <line x1="3" y1="12" x2="21" y2="12" />
            <line x1="3" y1="6" x2="21" y2="6" />
            <line x1="3" y1="18" x2="21" y2="18" />
          </svg>
        </button>
        <h1 className="text-lg font-semibold text-text-primary">{title}</h1>
      </div>

      <Button size="sm" onClick={openNewAppointment}>
        + New Appointment
      </Button>
    </header>
  );
}
