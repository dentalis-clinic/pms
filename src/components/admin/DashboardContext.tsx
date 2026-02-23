"use client";

import { createContext, useContext, useState, useCallback, type ReactNode } from "react";

interface DashboardContextValue {
  sidebarOpen: boolean;
  toggleSidebar: () => void;
  closeSidebar: () => void;
  walkInOpen: boolean;
  openWalkIn: () => void;
  closeWalkIn: () => void;
  refreshKey: number;
  triggerRefresh: () => void;
}

const DashboardContext = createContext<DashboardContextValue | null>(null);

export function DashboardProvider({ children }: { children: ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [walkInOpen, setWalkInOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const toggleSidebar = useCallback(() => setSidebarOpen((v) => !v), []);
  const closeSidebar = useCallback(() => setSidebarOpen(false), []);
  const openWalkIn = useCallback(() => setWalkInOpen(true), []);
  const closeWalkIn = useCallback(() => setWalkInOpen(false), []);
  const triggerRefresh = useCallback(() => setRefreshKey((k) => k + 1), []);

  return (
    <DashboardContext.Provider
      value={{
        sidebarOpen,
        toggleSidebar,
        closeSidebar,
        walkInOpen,
        openWalkIn,
        closeWalkIn,
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
