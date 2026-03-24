"use client";

import { useState, useMemo, useRef, useEffect, useCallback } from "react";
import { formatISTDateTime } from "@/lib/utils/date";
import type { AppointmentRow } from "@/types/patient";
import type { AppointmentStatus } from "@/generated/prisma/client";
import { Input, Badge } from "@/components/ui";
import { Button } from "@/components/ui/Button";
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

  // Selection state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkCancelling, setBulkCancelling] = useState(false);
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [confirmingAction, setConfirmingAction] = useState<"cancel" | "delete" | null>(null);

  // Mark Complete state
  const [completingId, setCompletingId] = useState<string | null>(null);

  const handleMarkComplete = useCallback(async (appointmentId: string) => {
    setCompletingId(appointmentId);
    try {
      const res = await fetch(`/api/appointments/${appointmentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "COMPLETED" }),
      });
      if (res.ok) onRefresh();
    } catch {
      // silently fail, user can retry
    } finally {
      setCompletingId(null);
    }
  }, [onRefresh]);

  // Clear selection when appointments change (filter/refresh/tab switch)
  useEffect(() => {
    setSelectedIds(new Set());
    setConfirmingAction(null);
  }, [appointments]);

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

  // Selection computations
  const someSelected = selectedIds.size > 0;
  const allSelected = sorted.length > 0 && sorted.every((a) => selectedIds.has(a.id));

  const selectedAppointments = useMemo(
    () => sorted.filter((a) => selectedIds.has(a.id)),
    [sorted, selectedIds]
  );

  const cancellableSelected = useMemo(
    () => selectedAppointments.filter((a) => a.status === "PENDING" || a.status === "OVERDUE"),
    [selectedAppointments]
  );

  // Toggle helpers
  function toggleSelectAll() {
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(sorted.map((a) => a.id)));
    }
    setConfirmingAction(null);
  }

  function toggleSelect(id: string) {
    const next = new Set(selectedIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelectedIds(next);
    setConfirmingAction(null);
  }

  // Bulk action handlers
  async function executeBulkCancel() {
    setBulkCancelling(true);
    try {
      const res = await fetch("/api/appointments/bulk-cancel", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: cancellableSelected.map((a) => a.id) }),
      });
      if (res.ok) {
        setSelectedIds(new Set());
        onRefresh();
      }
    } catch {
      // silently fail, user can retry
    } finally {
      setBulkCancelling(false);
      setConfirmingAction(null);
    }
  }

  async function executeBulkDelete() {
    setBulkDeleting(true);
    try {
      const res = await fetch("/api/appointments/bulk-delete", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: selectedAppointments.map((a) => a.id) }),
      });
      if (res.ok) {
        setSelectedIds(new Set());
        onRefresh();
      }
    } catch {
      // silently fail, user can retry
    } finally {
      setBulkDeleting(false);
      setConfirmingAction(null);
    }
  }

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

      {/* Bulk Action Bar */}
      {someSelected && (
        <div className="flex items-center justify-between rounded-lg border border-border-primary bg-surface-secondary px-4 py-2.5">
          {confirmingAction === null ? (
            <>
              <span className="text-sm font-medium text-text-primary">
                {selectedIds.size} selected
              </span>
              <div className="flex items-center gap-2">
                {cancellableSelected.length > 0 && (
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => setConfirmingAction("cancel")}
                    disabled={bulkCancelling || bulkDeleting}
                  >
                    Cancel ({cancellableSelected.length})
                  </Button>
                )}
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setConfirmingAction("delete")}
                  disabled={bulkCancelling || bulkDeleting}
                  className="text-text-error border-border-error hover:bg-surface-error/50"
                >
                  Delete ({selectedIds.size})
                </Button>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedIds(new Set());
                    setConfirmingAction(null);
                  }}
                  className="text-sm text-text-hint hover:text-text-secondary"
                >
                  Clear
                </button>
              </div>
            </>
          ) : confirmingAction === "cancel" ? (
            <>
              <span className="text-sm text-text-primary">
                Cancel {cancellableSelected.length} appointment{cancellableSelected.length !== 1 ? "s" : ""}? This cannot be undone.
              </span>
              <div className="flex items-center gap-2">
                <Button
                  variant="primary"
                  size="sm"
                  onClick={executeBulkCancel}
                  loading={bulkCancelling}
                  loadingText="Cancelling..."
                  className="bg-interactive-error hover:bg-interactive-error-hover"
                >
                  Yes, Cancel
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setConfirmingAction(null)}
                  disabled={bulkCancelling}
                >
                  No
                </Button>
              </div>
            </>
          ) : (
            <>
              <span className="text-sm text-text-primary">
                Permanently delete {selectedIds.size} appointment{selectedIds.size !== 1 ? "s" : ""}? This cannot be undone.
              </span>
              <div className="flex items-center gap-2">
                <Button
                  variant="primary"
                  size="sm"
                  onClick={executeBulkDelete}
                  loading={bulkDeleting}
                  loadingText="Deleting..."
                  className="bg-interactive-error hover:bg-interactive-error-hover"
                >
                  Yes, Delete
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setConfirmingAction(null)}
                  disabled={bulkDeleting}
                >
                  No
                </Button>
              </div>
            </>
          )}
        </div>
      )}

      <div className="overflow-x-auto rounded-lg border border-border-primary">
        <table className="min-w-full divide-y divide-border-primary">
          <thead className="bg-surface-secondary">
            <tr>
              <th className="w-8 px-3 py-2">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={toggleSelectAll}
                  className="accent-interactive-primary h-4 w-4 rounded"
                  aria-label="Select all"
                />
              </th>
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
                ONLINE: "\u{1F310}",
                PHONE: "\u{1F4F1}",
                WALK_IN: "\u{1F464}",
                SMS: "\u{1F4AC}",
                WHATSAPP: "\u{1F4AC}",
              }[a.bookingChannel];

              return (
                <tr
                  key={a.id}
                  className={`text-sm ${isHighlighted ? "animate-pulse bg-surface-warning" : ""} ${selectedIds.has(a.id) ? "bg-surface-brand/5" : ""}`}
                >
                  <td className="whitespace-nowrap px-3 py-2">
                    <input
                      type="checkbox"
                      checked={selectedIds.has(a.id)}
                      onChange={() => toggleSelect(a.id)}
                      className="accent-interactive-primary h-4 w-4 rounded"
                      aria-label={`Select appointment for ${a.patient.name}`}
                    />
                  </td>
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
                          {"\u21A9\uFE0F"} {VISIT_TYPE_LABEL.FOLLOW_UP}
                        </Badge>
                      )}
                    </div>
                  </td>
                  <td className="whitespace-nowrap px-3 py-2">
                    <Badge
                      variant={statusBadge.variant}
                      className={a.priority === "EMERGENCY" ? "border-2 border-red-500" : ""}
                    >
                      {a.priority === "EMERGENCY" && "\u{1F6A8} "}
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

                      {/* CONFIRMED → Mark Complete + Print Prescription */}
                      {a.status === "CONFIRMED" && (
                        <button
                          type="button"
                          onClick={() => handleMarkComplete(a.id)}
                          disabled={completingId === a.id}
                          className="rounded bg-interactive-success px-2.5 py-1 text-xs font-medium text-text-inverse hover:bg-interactive-success-hover disabled:opacity-50"
                        >
                          {completingId === a.id ? "..." : "Mark Complete"}
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
