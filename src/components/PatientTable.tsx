"use client";

import { useState, useMemo, useRef, useEffect, useCallback } from "react";
import { formatISTDateTime } from "@/lib/utils/date";
import type { AppointmentRow } from "@/types/patient";
import type { AppointmentStatus } from "@/generated/prisma/client";
import { Input, Badge } from "@/components/ui";
import { STATUS_BADGE, CHANNEL_LABEL, VISIT_TYPE_LABEL } from "@/lib/constants/appointment";

interface PatientTableProps {
  appointments: AppointmentRow[];
  onRefresh: () => void;
  highlightId?: string;
  onConfirmAppointment: (appointment: AppointmentRow) => void;
  search?: string;
}

type SortKey = "patientId" | "name" | "preferredDateTime" | "createdAt" | "status";

// --- Kebab Menu ---

function KebabMenu({
  appointmentId,
  status,
  onRefresh,
}: {
  appointmentId: string;
  status: AppointmentStatus;
  onRefresh: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [menuPos, setMenuPos] = useState({ top: 0, left: 0 });

  const canCancel = status === "PENDING" || status === "OVERDUE" || status === "CONFIRMED";

  // Close on click outside
  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (
        menuRef.current &&
        !menuRef.current.contains(e.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
        setConfirming(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  const handleCancel = useCallback(async () => {
    setCancelling(true);
    try {
      const res = await fetch(`/api/appointments/${appointmentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "CANCELLED" }),
      });
      if (res.ok) {
        onRefresh();
      }
    } catch {
      // silently fail, user can retry
    } finally {
      setCancelling(false);
      setOpen(false);
      setConfirming(false);
    }
  }, [appointmentId, onRefresh]);

  function toggleMenu() {
    if (!open && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setMenuPos({ top: rect.bottom + 4, left: rect.right - 176 }); // 176 = w-44 (11rem)
    }
    setOpen(!open);
    setConfirming(false);
  }

  if (!canCancel) return null;

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        onClick={toggleMenu}
        className="rounded p-1 text-text-tertiary hover:bg-surface-tertiary hover:text-text-secondary"
        aria-label="More actions"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 20 20"
          fill="currentColor"
          className="h-4 w-4"
        >
          <path d="M10 3a1.5 1.5 0 110 3 1.5 1.5 0 010-3zM10 8.5a1.5 1.5 0 110 3 1.5 1.5 0 010-3zM11.5 15.5a1.5 1.5 0 10-3 0 1.5 1.5 0 003 0z" />
        </svg>
      </button>

      {open && (
        <div
          ref={menuRef}
          className="fixed z-50 w-44 rounded-md border border-border-primary bg-surface-primary shadow-lg"
          style={{ top: menuPos.top, left: menuPos.left }}
        >
          {!confirming ? (
            <button
              type="button"
              onClick={() => setConfirming(true)}
              className="w-full px-3 py-2 text-left text-sm text-text-error hover:bg-surface-error/50"
            >
              Cancel Appointment
            </button>
          ) : (
            <div className="p-3 space-y-2">
              <p className="text-xs text-text-secondary">
                Are you sure? This cannot be undone.
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleCancel}
                  disabled={cancelling}
                  className="flex-1 rounded bg-interactive-error px-2 py-1 text-xs text-text-inverse hover:bg-interactive-error-hover disabled:opacity-50"
                >
                  {cancelling ? "..." : "Yes, Cancel"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setConfirming(false);
                    setOpen(false);
                  }}
                  className="flex-1 rounded border border-border-secondary px-2 py-1 text-xs text-text-secondary hover:bg-surface-secondary"
                >
                  No
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </>
  );
}

// --- Main Table ---

export default function PatientTable({
  appointments,
  onRefresh,
  highlightId,
  onConfirmAppointment,
  search: externalSearch,
}: PatientTableProps) {
  const [internalSearch, setInternalSearch] = useState("");
  const search = externalSearch ?? internalSearch;
  const [sortKey, setSortKey] = useState<SortKey>("createdAt");
  const [sortAsc, setSortAsc] = useState(false);

  const filtered = useMemo(() => {
    if (!search.trim()) return appointments;
    const q = search.toLowerCase();
    return appointments.filter(
      (a) =>
        a.patient.name.toLowerCase().includes(q) ||
        a.patient.phone.includes(q) ||
        a.patient.patientId.toLowerCase().includes(q)
    );
  }, [appointments, search]);

  const sorted = useMemo(() => {
    const arr = [...filtered];
    arr.sort((a, b) => {
      let cmp = 0;
      switch (sortKey) {
        case "patientId":
          cmp = a.patient.patientId.localeCompare(b.patient.patientId);
          break;
        case "name":
          cmp = a.patient.name.localeCompare(b.patient.name);
          break;
        case "preferredDateTime":
          cmp = a.preferredDateTime.localeCompare(b.preferredDateTime);
          break;
        case "createdAt":
          cmp = a.createdAt.localeCompare(b.createdAt);
          break;
        case "status":
          cmp = a.status.localeCompare(b.status);
          break;
      }
      return sortAsc ? cmp : -cmp;
    });
    return arr;
  }, [filtered, sortKey, sortAsc]);

  function handleSort(key: SortKey) {
    if (sortKey === key) {
      setSortAsc(!sortAsc);
    } else {
      setSortKey(key);
      setSortAsc(true);
    }
  }

  const sortIndicator = (key: SortKey) =>
    sortKey === key ? (sortAsc ? " \u2191" : " \u2193") : "";

  const thClass =
    "px-3 py-2 text-left text-xs font-medium text-text-hint uppercase tracking-wider cursor-pointer select-none hover:text-text-brand";

  if (appointments.length === 0) {
    return (
      <div className="rounded-lg border border-border-primary bg-surface-primary p-8 text-center">
        <p className="text-sm text-text-hint">
          No appointments yet. Click &quot;New Appointment&quot; to register a patient.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {externalSearch === undefined && (
        <Input
          type="text"
          value={internalSearch}
          onChange={(e) => setInternalSearch(e.target.value)}
          placeholder="Search by name, phone, or patient ID..."
          className="max-w-sm"
        />
      )}

      <div className="overflow-x-auto rounded-lg border border-border-primary">
        <table className="min-w-full divide-y divide-border-primary">
          <thead className="bg-surface-secondary">
            <tr>
              <th className={thClass} onClick={() => handleSort("patientId")}>
                Patient ID{sortIndicator("patientId")}
              </th>
              <th className={thClass} onClick={() => handleSort("name")}>
                Name{sortIndicator("name")}
              </th>
              <th className={thClass}>Phone</th>
              <th className={thClass}>Visit</th>
              <th className={thClass} onClick={() => handleSort("status")}>
                Status{sortIndicator("status")}
              </th>
              <th className={thClass} onClick={() => handleSort("preferredDateTime")}>
                Scheduled{sortIndicator("preferredDateTime")}
              </th>
              <th className={thClass}>Reason</th>
              <th className={thClass} onClick={() => handleSort("createdAt")}>
                Created{sortIndicator("createdAt")}
              </th>
              <th className="px-3 py-2 text-left text-xs font-medium text-text-hint uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border-primary bg-surface-primary">
            {sorted.map((a) => {
              const isHighlighted = highlightId === a.id;
              const statusBadge = STATUS_BADGE[a.status];

              // Channel icon mapping
              const channelIcon = {
                ONLINE: "🌐",
                PHONE: "📱",
                WALK_IN: "👤",
                SMS: "💬",
                WHATSAPP: "💬",
              }[a.bookingChannel];

              return (
                <tr
                  key={a.id}
                  className={`text-sm ${isHighlighted ? "animate-pulse bg-surface-warning" : ""}`}
                >
                  <td className="whitespace-nowrap px-3 py-2 font-mono text-xs text-text-brand">
                    {a.patient.patientId}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2 text-text-primary">
                    {a.patient.name}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2 text-text-secondary">
                    {a.patient.phone}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs opacity-60" title={CHANNEL_LABEL[a.bookingChannel]}>
                        {channelIcon}
                      </span>
                      {a.visitType === "FOLLOW_UP" && (
                        <Badge variant="neutral" className="text-xs">
                          ↩️ {VISIT_TYPE_LABEL.FOLLOW_UP}
                        </Badge>
                      )}
                    </div>
                  </td>
                  <td className="whitespace-nowrap px-3 py-2">
                    <Badge
                      variant={statusBadge.variant}
                      className={a.priority === "EMERGENCY" ? "border-2 border-red-500" : ""}
                    >
                      {a.priority === "EMERGENCY" && "🚨 "}
                      {statusBadge.label}
                    </Badge>
                  </td>
                  <td className="whitespace-nowrap px-3 py-2 text-text-secondary">
                    {formatISTDateTime(new Date(a.preferredDateTime))}
                  </td>
                  <td className="max-w-[200px] truncate px-3 py-2 text-text-secondary" title={a.reasonForVisit ?? undefined}>
                    {a.reasonForVisit ?? <span className="text-text-tertiary">&mdash;</span>}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2 text-text-hint text-xs">
                    {formatISTDateTime(new Date(a.createdAt))}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2">
                    <div className="flex items-center gap-1.5">
                      {/* PENDING or OVERDUE → Confirm button (patient arrived) */}
                      {(a.status === "PENDING" || a.status === "OVERDUE") && (
                        <button
                          type="button"
                          onClick={() => onConfirmAppointment(a)}
                          className="rounded bg-interactive-primary px-2.5 py-1 text-xs font-medium text-text-inverse hover:bg-interactive-primary-hover"
                        >
                          Confirm
                        </button>
                      )}

                      {/* CONFIRMED or COMPLETED → Print Prescription */}
                      {(a.status === "CONFIRMED" || a.status === "COMPLETED") && (
                        <a
                          href={`/admin/dashboard/prescription/blank/${a.id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="rounded border border-border-secondary px-2.5 py-1 text-xs font-medium text-text-secondary hover:bg-surface-secondary hover:text-text-primary"
                        >
                          Print Prescription
                        </a>
                      )}

                      {/* Kebab menu for cancellation */}
                      <KebabMenu
                        appointmentId={a.id}
                        status={a.status}
                        onRefresh={onRefresh}
                      />
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-text-tertiary">
        {filtered.length} appointment{filtered.length !== 1 ? "s" : ""}
        {search && ` matching "${search}"`}
      </p>
    </div>
  );
}
