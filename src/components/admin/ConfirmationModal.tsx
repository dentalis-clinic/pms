"use client";

import { DateTime } from "luxon";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";

interface ConfirmationModalProps {
  patientName: string;
  patientPhone: string;
  sex: string;
  dateOfBirth: string;
  preferredDateTime: string;
  reasonForVisit: string;
  doctorName: string;
  isConfirmMode: boolean;
  loading: boolean;
  error: string;
  onConfirmAndPrint: () => void;
  onConfirmOnly: () => void;
  onCancel: () => void;
}

export function ConfirmationModal({
  patientName,
  patientPhone,
  sex,
  dateOfBirth,
  preferredDateTime,
  reasonForVisit,
  doctorName,
  isConfirmMode,
  loading,
  error,
  onConfirmAndPrint,
  onConfirmOnly,
  onCancel,
}: ConfirmationModalProps) {
  const formattedDateTime = preferredDateTime
    ? DateTime.fromISO(preferredDateTime)
        .setZone("Asia/Kolkata")
        .toFormat("dd LLL yyyy, hh:mm a")
    : "—";

  const formattedDOB = dateOfBirth
    ? DateTime.fromISO(dateOfBirth).toFormat("dd LLL yyyy")
    : "Not specified";

  const sexLabel = sex
    ? sex.charAt(0) + sex.slice(1).toLowerCase()
    : "Not specified";

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center">
      <div className="fixed inset-0 bg-surface-overlay/30" onClick={loading ? undefined : onCancel} />
      <div className="relative z-10 w-full max-w-md rounded-lg border border-border-primary bg-surface-primary shadow-lg">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border-primary px-6 py-4">
          <h3 className="text-base font-semibold text-text-primary">
            {isConfirmMode ? "Confirm Appointment" : "Create & Confirm Appointment"}
          </h3>
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="rounded-md p-1 text-text-tertiary hover:bg-surface-tertiary hover:text-text-secondary disabled:opacity-50"
            aria-label="Close"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="space-y-4 px-6 py-4">
          <p className="text-sm text-text-secondary">
            Review the appointment details:
          </p>

          <dl className="space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-text-hint">Patient</dt>
              <dd className="font-medium text-text-primary">{patientName}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-text-hint">Phone</dt>
              <dd className="text-text-primary">{patientPhone}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-text-hint">Sex</dt>
              <dd className="text-text-primary">{sexLabel}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-text-hint">DOB</dt>
              <dd className="text-text-primary">{formattedDOB}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-text-hint">Scheduled</dt>
              <dd className="text-text-primary">{formattedDateTime}</dd>
            </div>
            {doctorName && (
              <div className="flex justify-between">
                <dt className="text-text-hint">Doctor</dt>
                <dd className="text-text-primary">{doctorName}</dd>
              </div>
            )}
            {reasonForVisit && (
              <div className="flex justify-between">
                <dt className="text-text-hint">Complaint</dt>
                <dd className="max-w-[60%] text-right text-text-primary">{reasonForVisit}</dd>
              </div>
            )}
          </dl>

          {error && <Alert variant="error">{error}</Alert>}
        </div>

        {/* Actions */}
        <div className="space-y-2 border-t border-border-primary px-6 py-4">
          <Button
            fullWidth
            loading={loading}
            loadingText="Confirming..."
            onClick={onConfirmAndPrint}
          >
            Confirm & Print Prescription
          </Button>
          <Button
            variant="secondary"
            fullWidth
            disabled={loading}
            onClick={onConfirmOnly}
          >
            Confirm Only
          </Button>
          <Button
            variant="ghost"
            fullWidth
            disabled={loading}
            onClick={onCancel}
          >
            Cancel
          </Button>
        </div>
      </div>
    </div>
  );
}
