"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { DateTime } from "luxon";
import type { AppointmentRow } from "@/types/patient";
import PatientTable from "@/components/PatientTable";
import CSVExportButton from "@/components/CSVExportButton";
import { useDashboard } from "./DashboardContext";
import { Button, Input } from "@/components/ui";

type DateTab = "all" | "today" | "upcoming";
type StatusFilter = "" | "PENDING" | "CONFIRMED" | "OVERDUE";
type TypeFilter = "" | "ONLINE" | "WALK_IN" | "FOLLOW_UP";

const TABS: { value: DateTab; label: string }[] = [
  { value: "all", label: "All" },
  { value: "today", label: "Today" },
  { value: "upcoming", label: "Upcoming" },
];

const STATUS_OPTIONS: { value: StatusFilter; label: string }[] = [
  { value: "", label: "All Statuses" },
  { value: "PENDING", label: "Pending" },
  { value: "CONFIRMED", label: "Confirmed" },
  { value: "OVERDUE", label: "Overdue" },
];

const TYPE_OPTIONS: { value: TypeFilter; label: string }[] = [
  { value: "", label: "All Types" },
  { value: "ONLINE", label: "Online" },
  { value: "WALK_IN", label: "Walk-in" },
  { value: "FOLLOW_UP", label: "Follow-up" },
];

interface AppointmentsViewProps {
  initialAppointments: AppointmentRow[];
}

/** Client-side date filter + sort — no network call needed for tab switches */
function filterByTab(
  appointments: AppointmentRow[],
  tab: DateTab
): AppointmentRow[] {
  if (tab === "all") return appointments;

  const now = DateTime.now().setZone("Asia/Kolkata");
  const todayStart = now.startOf("day");
  const tomorrowStart = todayStart.plus({ days: 1 });

  if (tab === "today") {
    return appointments
      .filter((a) => {
        const dt = DateTime.fromISO(a.preferredDateTime).setZone(
          "Asia/Kolkata"
        );
        return dt >= todayStart && dt < tomorrowStart;
      })
      .sort(
        (a, b) =>
          new Date(a.preferredDateTime).getTime() -
          new Date(b.preferredDateTime).getTime()
      );
  }

  // upcoming = tomorrow onward, non-cancelled
  return appointments
    .filter((a) => {
      const dt = DateTime.fromISO(a.preferredDateTime).setZone("Asia/Kolkata");
      return dt >= tomorrowStart && a.status !== "CANCELLED";
    })
    .sort(
      (a, b) =>
        new Date(a.preferredDateTime).getTime() -
        new Date(b.preferredDateTime).getTime()
    );
}

export default function AppointmentsView({
  initialAppointments,
}: AppointmentsViewProps) {
  const { refreshKey, openConfirmAppointment } = useDashboard();
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  // Initialize from URL params
  const initialTab = (searchParams.get("tab") as DateTab) || "all";
  const initialStatus = (searchParams.get("status") as StatusFilter) || "";
  const initialType = (searchParams.get("type") as TypeFilter) || "";

  const [activeTab, setActiveTab] = useState<DateTab>(
    TABS.some((t) => t.value === initialTab) ? initialTab : "all"
  );
  const [statusFilter, setStatusFilter] = useState<StatusFilter>(
    STATUS_OPTIONS.some((o) => o.value === initialStatus) ? initialStatus : ""
  );
  const [typeFilter, setTypeFilter] = useState<TypeFilter>(
    TYPE_OPTIONS.some((o) => o.value === initialType) ? initialType : ""
  );
  const [search, setSearch] = useState("");
  const [allAppointments, setAllAppointments] =
    useState<AppointmentRow[]>(initialAppointments);
  const [loading, setLoading] = useState(false);
  const isFirstRender = useRef(true);

  // Sync filter state → URL (shallow, no re-fetch)
  const updateURL = useCallback(
    (tab: DateTab, status: StatusFilter, type: TypeFilter) => {
      const params = new URLSearchParams();
      if (tab !== "all") params.set("tab", tab);
      if (status) params.set("status", status);
      if (type) params.set("type", type);
      const qs = params.toString();
      router.replace(`${pathname}${qs ? `?${qs}` : ""}`, { scroll: false });
    },
    [router, pathname]
  );

  const handleTabChange = (tab: DateTab) => {
    setActiveTab(tab);
    updateURL(tab, statusFilter, typeFilter);
  };

  const handleStatusChange = (status: StatusFilter) => {
    setStatusFilter(status);
    updateURL(activeTab, status, typeFilter);
  };

  const handleTypeChange = (type: TypeFilter) => {
    setTypeFilter(type);
    updateURL(activeTab, statusFilter, type);
  };

  const clearFilters = () => {
    setStatusFilter("");
    setTypeFilter("");
    updateURL(activeTab, "", "");
  };

  const hasActiveFilters = statusFilter !== "" || typeFilter !== "";

  // Fetch ALL appointments (no date filter) — tab filtering is client-side
  const fetchAppointments = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/appointments/list?dateFilter=all");
      const data = await res.json();
      if (data.success) {
        setAllAppointments(data.appointments);
      }
    } catch (err) {
      console.error("Failed to fetch appointments:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Skip initial render — server already fetched the data
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    fetchAppointments();
  }, [fetchAppointments, refreshKey]);

  // Apply tab + status + type filters
  const filteredAppointments = useMemo(() => {
    let result = filterByTab(allAppointments, activeTab);

    if (statusFilter) {
      result = result.filter((a) => a.status === statusFilter);
    }

    if (typeFilter === "FOLLOW_UP") {
      result = result.filter((a) => a.visitType === "FOLLOW_UP");
    } else if (typeFilter === "ONLINE") {
      result = result.filter((a) => a.bookingChannel === "ONLINE");
    } else if (typeFilter === "WALK_IN") {
      result = result.filter((a) => a.bookingChannel === "WALK_IN");
    }

    return result;
  }, [allAppointments, activeTab, statusFilter, typeFilter]);

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
          <CSVExportButton appointments={filteredAppointments} />
          <Button
            variant="secondary"
            size="sm"
            onClick={fetchAppointments}
          >
            Refresh
          </Button>
        </div>
      </div>

      {/* Search + Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <Input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name, phone, or ID..."
          className="w-full sm:w-64"
        />

        <select
          value={statusFilter}
          onChange={(e) => handleStatusChange(e.target.value as StatusFilter)}
          className="rounded-md border border-border-primary bg-surface-primary px-3 py-1.5 text-sm text-text-primary"
        >
          {STATUS_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>

        <select
          value={typeFilter}
          onChange={(e) => handleTypeChange(e.target.value as TypeFilter)}
          className="rounded-md border border-border-primary bg-surface-primary px-3 py-1.5 text-sm text-text-primary"
        >
          {TYPE_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>

        {hasActiveFilters && (
          <button
            onClick={clearFilters}
            className="text-sm text-text-hint hover:text-text-secondary"
          >
            Clear filters
          </button>
        )}
      </div>

      {loading ? (
        <div className="py-12 text-center text-sm text-text-hint">
          Loading appointments...
        </div>
      ) : (
        <PatientTable
          appointments={filteredAppointments}
          onRefresh={fetchAppointments}
          onConfirmAppointment={openConfirmAppointment}
          search={search}
        />
      )}
    </div>
  );
}
