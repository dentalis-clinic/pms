"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import type { AppointmentRow } from "@/types/patient";
import PatientTable from "@/components/PatientTable";
import CSVExportButton from "@/components/CSVExportButton";
import { useDashboard } from "./DashboardContext";
import { Button } from "@/components/ui";

type DateTab = "today" | "upcoming" | "all";

const TABS: { value: DateTab; label: string }[] = [
  { value: "all", label: "All" },
  { value: "today", label: "Today" },
  { value: "upcoming", label: "Upcoming" },
];

interface AppointmentsViewProps {
  initialAppointments: AppointmentRow[];
}

export default function AppointmentsView({
  initialAppointments,
}: AppointmentsViewProps) {
  const { refreshKey, openConfirmAppointment } = useDashboard();
  const [activeTab, setActiveTab] = useState<DateTab>("today");
  const [appointments, setAppointments] =
    useState<AppointmentRow[]>(initialAppointments);
  const [loading, setLoading] = useState(false);
  const isFirstRender = useRef(true);

  const fetchAppointments = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({ dateFilter: activeTab });
      if (activeTab === "today") {
        params.set("sortBy", "preferredDateTime");
        params.set("sortOrder", "asc");
      }
      const res = await fetch(`/api/appointments/list?${params}`);
      const data = await res.json();
      if (data.success) {
        setAppointments(data.appointments);
      }
    } catch (err) {
      console.error("Failed to fetch appointments:", err);
    } finally {
      setLoading(false);
    }
  }, [activeTab]);

  useEffect(() => {
    // Skip initial render for the "today" tab — server already fetched it
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    fetchAppointments();
  }, [fetchAppointments, refreshKey]);

  // When tab changes after first render, always fetch
  const handleTabChange = (tab: DateTab) => {
    setActiveTab(tab);
    // activeTab state update will trigger the useEffect on next render,
    // but since isFirstRender is already false, it will fetch.
    // However, we need to handle the case where the user clicks "today"
    // after switching away — the useEffect dependency on activeTab handles this.
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        {/* Segmented tabs */}
        <div className="inline-flex rounded-md border border-border-primary bg-surface-secondary p-0.5">
          {TABS.map((tab) => (
            <button
              key={tab.value}
              onClick={() => handleTabChange(tab.value)}
              className={`rounded-md px-4 py-1.5 text-sm font-medium transition-colors ${
                activeTab === tab.value
                  ? "bg-surface-primary text-text-primary shadow-sm"
                  : "text-text-hint hover:text-text-secondary"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <CSVExportButton appointments={appointments} />
          <Button
            variant="secondary"
            size="sm"
            onClick={fetchAppointments}
          >
            Refresh
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="py-12 text-center text-sm text-text-hint">
          Loading appointments...
        </div>
      ) : (
        <PatientTable
          appointments={appointments}
          onRefresh={fetchAppointments}
          onConfirmAppointment={openConfirmAppointment}
        />
      )}
    </div>
  );
}
