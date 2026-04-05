"use client";

import { useEffect, useState, useCallback } from "react";
import type { AppointmentRow } from "@/types/patient";
import { CHANNEL_LABEL, VISIT_TYPE_LABEL } from "@/lib/constants/appointment";
import { formatISTDateTime } from "@/lib/utils/date";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";

interface AppointmentDetailsModalProps {
  appointment: AppointmentRow;
  onClose: () => void;
  onConfirmAppointment: (appointment: AppointmentRow) => void;
  onRefresh: () => void;
}

export function AppointmentDetailsModal({
  appointment,
  onClose,
  onConfirmAppointment,
  onRefresh,
}: AppointmentDetailsModalProps) {
  const [cancelling, setCancelling] = useState(false);
  const [confirmingCancel, setConfirmingCancel] = useState(false);
  const [cancelError, setCancelError] = useState("");
  const [completing, setCompleting] = useState(false);
  const [completeError, setCompleteError] = useState("");

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [onClose]);

  const handleCancel = useCallback(async () => {
    setCancelling(true);
    setCancelError("");
    try {
      const res = await fetch(`/api/appointments/${appointment.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "CANCELLED" }),
      });
      if (res.ok) {
        onClose();
        onRefresh();
      } else {
        setCancelError("Failed to cancel. Please try again.");
      }
    } catch {
      setCancelError("Failed to cancel. Please try again.");
    } finally {
      setCancelling(false);
    }
  }, [appointment.id, onClose, onRefresh]);

  const handleMarkComplete = useCallback(async () => {
    setCompleting(true);
    setCompleteError("");
    try {
      const res = await fetch(`/api/appointments/${appointment.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "COMPLETED" }),
      });
      if (res.ok) {
        onClose();
        onRefresh();
      } else {
        setCompleteError("Failed to mark complete. Please try again.");
      }
    } catch {
      setCompleteError("Failed to mark complete. Please try again.");
    } finally {
      setCompleting(false);
    }
  }, [appointment.id, onClose, onRefresh]);

  const canEdit =
    appointment.status === "PENDING" || appointment.status === "OVERDUE";
  const canCancel =
    appointment.status === "PENDING" ||
    appointment.status === "OVERDUE" ||
    appointment.status === "CONFIRMED";
  const canComplete = appointment.status === "CONFIRMED";

  const paymentDisplay = (() => {
    if (appointment.totalAmount == null && appointment.paidAmount == null) return null;
    const total = appointment.totalAmount != null ? `₹${appointment.totalAmount}` : "—";
    const paid = appointment.paidAmount != null ? `₹${appointment.paidAmount}` : "—";
    return { total, paid };
  })();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-surface-overlay/30" onClick={onClose} />
      <div className="relative z-10 w-full max-w-md rounded-lg border border-border-primary bg-surface-primary shadow-lg">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border-primary px-6 py-4">
          <h3 className="text-base font-semibold text-text-primary">Appointment Details</h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1 text-text-tertiary hover:bg-surface-tertiary hover:text-text-secondary"
            aria-label="Close"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-4">
          <dl className="space-y-3 text-sm">
            <div className="flex justify-between">
              <dt className="text-text-hint">Patient</dt>
              <dd className="font-medium text-text-primary">{appointment.patient.name}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-text-hint">Phone</dt>
              <dd className="text-text-primary">{appointment.patient.phone}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-text-hint">Created on</dt>
              <dd className="text-text-primary">
                {formatISTDateTime(new Date(appointment.createdAt))}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-text-hint">Booking method</dt>
              <dd className="text-text-primary">{CHANNEL_LABEL[appointment.bookingChannel]}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-text-hint">Visit type</dt>
              <dd className="text-text-primary">{VISIT_TYPE_LABEL[appointment.visitType]}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-text-hint">Treating doctor</dt>
              <dd className="text-text-primary">{appointment.doctor?.name ?? "—"}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-text-hint">Scheduled for</dt>
              <dd className="text-text-primary">
                {formatISTDateTime(new Date(appointment.preferredDateTime))}
              </dd>
            </div>
            <div className="flex gap-4 justify-between">
              <dt className="shrink-0 text-text-hint">Chief complaint</dt>
              <dd className="text-right text-text-primary">
                {appointment.reasonForVisit ?? "—"}
              </dd>
            </div>
            {paymentDisplay ? (
              <>
                <div className="flex justify-between">
                  <dt className="text-text-hint">Total amount</dt>
                  <dd className="text-text-primary">{paymentDisplay.total}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-text-hint">Paid</dt>
                  <dd className="text-text-primary">{paymentDisplay.paid}</dd>
                </div>
              </>
            ) : (
              <div className="flex justify-between">
                <dt className="text-text-hint">Payment</dt>
                <dd className="text-text-tertiary">—</dd>
              </div>
            )}
          </dl>
        </div>

        {/* Actions */}
        {(canEdit || canCancel || canComplete) && (
          <div className="space-y-2 border-t border-border-primary px-6 py-4">
            {completeError && <Alert variant="error">{completeError}</Alert>}
            {cancelError && <Alert variant="error">{cancelError}</Alert>}

            {!confirmingCancel ? (
              <div className="flex flex-wrap gap-2">
                {canEdit && (
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => {
                      onClose();
                      onConfirmAppointment(appointment);
                    }}
                  >
                    Edit Appointment
                  </Button>
                )}
                {canComplete && (
                  <Button
                    variant="secondary"
                    size="sm"
                    loading={completing}
                    loadingText="Completing..."
                    onClick={handleMarkComplete}
                  >
                    Mark Complete
                  </Button>
                )}
                {canCancel && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setConfirmingCancel(true)}
                    className="text-text-error hover:bg-surface-error/50"
                  >
                    Cancel Appointment
                  </Button>
                )}
              </div>
            ) : (
              <div className="space-y-2">
                <p className="text-sm text-text-secondary">
                  Cancel this appointment? This cannot be undone.
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="primary"
                    size="sm"
                    loading={cancelling}
                    loadingText="Cancelling..."
                    onClick={handleCancel}
                    className="bg-interactive-error hover:bg-interactive-error-hover"
                  >
                    Yes, Cancel
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    disabled={cancelling}
                    onClick={() => {
                      setConfirmingCancel(false);
                      setCancelError("");
                    }}
                  >
                    No, Go Back
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
