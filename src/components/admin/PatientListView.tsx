"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { DateTime } from "luxon";
import type { PatientRow } from "@/types/patient";
import PatientTable from "@/components/PatientTable";
import CSVExportButton from "@/components/CSVExportButton";
import { useDashboard } from "./DashboardContext";
import { Button } from "@/components/ui";

interface PatientListViewProps {
  filter: "today" | "all";
}

export default function PatientListView({ filter }: PatientListViewProps) {
  const { refreshKey } = useDashboard();
  const [patients, setPatients] = useState<PatientRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [highlightId, setHighlightId] = useState<string | undefined>();
  const highlightTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchPatients = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/appointments/list");
      const data = await res.json();
      if (data.success) {
        setPatients(data.patients);
      }
    } catch (err) {
      console.error("Failed to fetch patients:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPatients();
  }, [fetchPatients, refreshKey]);

  // Clear highlight timer on unmount
  useEffect(() => {
    return () => {
      if (highlightTimerRef.current) clearTimeout(highlightTimerRef.current);
    };
  }, []);

  const filteredPatients = filter === "today"
    ? patients.filter((p) => {
        const preferred = DateTime.fromISO(p.preferredDateTime).setZone("Asia/Kolkata");
        const today = DateTime.now().setZone("Asia/Kolkata").startOf("day");
        return preferred >= today && preferred < today.plus({ days: 1 });
      })
    : patients;

  const title = filter === "today" ? "Today's Appointments" : "Appointment History";

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-neutral-950">
          {title}
        </h2>
        <div className="flex items-center gap-2">
          <CSVExportButton patients={filteredPatients} />
          <Button variant="secondary" size="sm" onClick={fetchPatients}>
            Refresh
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="py-12 text-center text-sm text-neutral-500">
          Loading patients...
        </div>
      ) : (
        <PatientTable
          patients={filteredPatients}
          onRefresh={fetchPatients}
          highlightId={highlightId}
        />
      )}
    </div>
  );
}
