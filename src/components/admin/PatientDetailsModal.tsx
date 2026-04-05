"use client";

import { useEffect } from "react";
import type { PatientRow } from "@/types/patient";

interface PatientDetailsModalProps {
  patient: PatientRow;
  onClose: () => void;
}

export function PatientDetailsModal({ patient, onClose }: PatientDetailsModalProps) {
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [onClose]);

  const sexLabel = patient.sex
    ? patient.sex.charAt(0) + patient.sex.slice(1).toLowerCase()
    : "—";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-surface-overlay/30" onClick={onClose} />
      <div className="relative z-10 w-full max-w-sm rounded-lg border border-border-primary bg-surface-primary shadow-lg">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border-primary px-6 py-4">
          <h3 className="text-base font-semibold text-text-primary">Patient Details</h3>
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
              <dt className="text-text-hint">Name</dt>
              <dd className="font-medium text-text-primary">{patient.name}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-text-hint">Patient ID</dt>
              <dd className="font-mono text-text-brand">{patient.patientId}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-text-hint">Phone</dt>
              <dd className="text-text-primary">{patient.phone}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-text-hint">Sex</dt>
              <dd className="text-text-primary">{sexLabel}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-text-hint">Age</dt>
              <dd className="text-text-primary">
                {patient.age != null ? `${patient.age} yrs` : "—"}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-text-hint">Email</dt>
              <dd className="text-text-primary">{patient.email ?? "—"}</dd>
            </div>
            <div className="flex gap-4 justify-between">
              <dt className="shrink-0 text-text-hint">Address</dt>
              <dd className="text-right text-text-primary">{patient.address ?? "—"}</dd>
            </div>
          </dl>
        </div>
      </div>
    </div>
  );
}
