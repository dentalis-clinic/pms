"use client";

import { createContext, useContext, useState, useCallback, type ReactNode } from "react";
import type { AppointmentRow } from "@/types/patient";

interface AppointmentSlideOverState {
  open: boolean;
  appointment: AppointmentRow | null; // null = "New Appointment" mode
}

interface DashboardContextValue {
  sidebarOpen: boolean;
  toggleSidebar: () => void;
  closeSidebar: () => void;
  appointmentSlideOver: AppointmentSlideOverState;
  openNewAppointment: () => void;
  openConfirmAppointment: (appointment: AppointmentRow) => void;
  closeAppointmentSlideOver: () => void;
  refreshKey: number;
  triggerRefresh: () => void;
}

const DashboardContext = createContext<DashboardContextValue | null>(null);

export function DashboardProvider({ children }: { children: ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [appointmentSlideOver, setAppointmentSlideOver] =
    useState<AppointmentSlideOverState>({ open: false, appointment: null });
  const [refreshKey, setRefreshKey] = useState(0);

  const toggleSidebar = useCallback(() => setSidebarOpen((v) => !v), []);
  const closeSidebar = useCallback(() => setSidebarOpen(false), []);

  const openNewAppointment = useCallback(
    () => setAppointmentSlideOver({ open: true, appointment: null }),
    []
  );
  const openConfirmAppointment = useCallback(
    (appointment: AppointmentRow) =>
      setAppointmentSlideOver({ open: true, appointment }),
    []
  );
  const closeAppointmentSlideOver = useCallback(
    () => setAppointmentSlideOver({ open: false, appointment: null }),
    []
  );

  const triggerRefresh = useCallback(() => setRefreshKey((k) => k + 1), []);

  return (
    <DashboardContext.Provider
      value={{
        sidebarOpen,
        toggleSidebar,
        closeSidebar,
        appointmentSlideOver,
        openNewAppointment,
        openConfirmAppointment,
        closeAppointmentSlideOver,
        refreshKey,
        triggerRefresh,
      }}
    >
      {children}
    </DashboardContext.Provider>
  );
}

export function useDashboard() {
  const ctx = useContext(DashboardContext);
  if (!ctx) throw new Error("useDashboard must be used within DashboardProvider");
  return ctx;
}
