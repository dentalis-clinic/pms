"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { DateTime } from "luxon";
import type { AppointmentRow } from "@/types/patient";
import PatientTable from "@/components/PatientTable";
import CSVExportButton from "@/components/CSVExportButton";
import { useDashboard } from "./DashboardContext";
import { Button } from "@/components/ui";

interface PatientListViewProps {
  filter: "today" | "all";
}

export default function PatientListView({ filter }: PatientListViewProps) {
  const { refreshKey, openConfirmAppointment } = useDashboard();
  const [appointments, setAppointments] = useState<AppointmentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [highlightId, setHighlightId] = useState<string | undefined>();
  const highlightTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchAppointments = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/appointments/list");
      const data = await res.json();
      if (data.success) {
        setAppointments(data.appointments);
      }
    } catch (err) {
      console.error("Failed to fetch appointments:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAppointments();
  }, [fetchAppointments, refreshKey]);

  useEffect(() => {
    return () => {
      if (highlightTimerRef.current) clearTimeout(highlightTimerRef.current);
    };
  }, []);

  const filteredAppointments =
    filter === "today"
      ? appointments.filter((a) => {
          const preferred = DateTime.fromISO(a.preferredDateTime).setZone(
            "Asia/Kolkata"
          );
          const today = DateTime.now()
            .setZone("Asia/Kolkata")
            .startOf("day");
          return preferred >= today && preferred < today.plus({ days: 1 });
        })
      : appointments;

  const title =
    filter === "today" ? "Today's Appointments" : "Appointment History";

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-text-primary">{title}</h2>
        <div className="flex items-center gap-2">
          <CSVExportButton appointments={filteredAppointments} />
          <Button variant="secondary" size="sm" onClick={fetchAppointments}>
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
          appointments={filteredAppointments}
          onRefresh={fetchAppointments}
          highlightId={highlightId}
          onConfirmAppointment={openConfirmAppointment}
        />
      )}
    </div>
  );
}
