"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import type { AppointmentRow } from "@/types/patient";
import PatientTable from "@/components/PatientTable";
import CSVExportButton from "@/components/CSVExportButton";
import { useDashboard } from "./DashboardContext";
import { Button } from "@/components/ui";

type DateTab = "all" | "today" | "upcoming";

const TABS: { value: DateTab; label: string }[] = [
  { value: "all", label: "All" },
  { value: "today", label: "Today" },
  { value: "upcoming", label: "Upcoming" },
];

interface AppointmentsViewProps {
  initialTab?: DateTab;
}

const PAGE_SIZE = 50;

export default function AppointmentsView({
  initialTab = "today",
}: AppointmentsViewProps) {
  const { refreshKey, openConfirmAppointment } = useDashboard();
  const [activeTab, setActiveTab] = useState<DateTab>(initialTab);
  const [appointments, setAppointments] = useState<AppointmentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const requestSeq = useRef(0);

  // Fetch only one page for the selected tab to keep payload small.
  const fetchAppointments = useCallback(async () => {
    const reqId = ++requestSeq.current;
    try {
      setLoading(true);
      const params = new URLSearchParams({
        dateFilter: activeTab,
        page: String(page),
        pageSize: String(PAGE_SIZE),
      });

      if (activeTab === "all") {
        params.set("sortBy", "createdAt");
        params.set("sortOrder", "desc");
      } else {
        params.set("sortBy", "preferredDateTime");
        params.set("sortOrder", "asc");
      }

      const res = await fetch(`/api/appointments/list?${params.toString()}`, {
        cache: "no-store",
      });
      const data = await res.json();
      if (reqId !== requestSeq.current) return;

      if (data.success && Array.isArray(data.appointments)) {
        setAppointments(data.appointments);
        setHasMore(Boolean(data.pagination?.hasMore));
      }
    } catch (err) {
      console.error("Failed to fetch appointments:", err);
      if (reqId === requestSeq.current) {
        setAppointments([]);
        setHasMore(false);
      }
    } finally {
      if (reqId === requestSeq.current) {
        setLoading(false);
      }
    }
  }, [activeTab, page]);

  useEffect(() => {
    fetchAppointments();
  }, [fetchAppointments, refreshKey]);

  function handleTabChange(tab: DateTab) {
    if (tab === activeTab) return;
    setActiveTab(tab);
    setPage(1);
  }

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

      {loading && appointments.length === 0 ? (
        <div className="py-12 text-center text-sm text-text-hint">
          Loading appointments...
        </div>
      ) : (
        <>
          <PatientTable
            appointments={appointments}
            onRefresh={fetchAppointments}
            onConfirmAppointment={openConfirmAppointment}
          />

          <div className="flex flex-col gap-2 rounded-md border border-border-primary bg-surface-primary p-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-text-hint">
              Page {page}
              {loading ? " • Refreshing..." : ""}
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={loading || page <= 1}
              >
                Previous
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setPage((p) => p + 1)}
                disabled={loading || !hasMore}
              >
                Next
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
