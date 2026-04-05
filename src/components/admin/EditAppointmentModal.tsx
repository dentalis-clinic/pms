"use client";

import { useEffect, useState, useCallback } from "react";
import { DateTime } from "luxon";
import type { AppointmentRow } from "@/types/patient";
import { CHANNEL_LABEL, VISIT_TYPE_LABEL } from "@/lib/constants/appointment";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";

interface Doctor {
  id: string;
  name: string;
  qualifications: string | null;
}

interface EditAppointmentModalProps {
  appointment: AppointmentRow;
  onClose: () => void;
  onRefresh: () => void;
}

export function EditAppointmentModal({
  appointment,
  onClose,
  onRefresh,
}: EditAppointmentModalProps) {
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // Format the appointment's preferredDateTime (UTC ISO) to IST for the datetime-local input
  const istFormatted = DateTime.fromISO(appointment.preferredDateTime)
    .setZone("Asia/Kolkata")
    .toFormat("yyyy-MM-dd'T'HH:mm");

  const [bookingChannel, setBookingChannel] = useState(appointment.bookingChannel);
  const [visitType, setVisitType] = useState(appointment.visitType);
  const [doctorId, setDoctorId] = useState(appointment.doctorId ?? "");
  const [preferredDateTime, setPreferredDateTime] = useState(istFormatted);
  const [reasonForVisit, setReasonForVisit] = useState(appointment.reasonForVisit ?? "");
  const [totalAmount, setTotalAmount] = useState(
    appointment.totalAmount != null ? String(appointment.totalAmount) : ""
  );
  const [paidAmount, setPaidAmount] = useState(
    appointment.paidAmount != null ? String(appointment.paidAmount) : ""
  );

  // Fetch active doctors
  useEffect(() => {
    fetch("/api/doctors")
      .then((r) => r.json())
      .then((data) => {
        if (data.success) setDoctors(data.doctors);
      })
      .catch(() => {});
  }, []);

  // Escape key to close
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [onClose]);

  const handleSave = useCallback(async () => {
    setSaving(true);
    setError("");

    const body: Record<string, unknown> = {
      bookingChannel,
      visitType,
      doctorId: doctorId || null,
      preferredDateTime,
      reasonForVisit: reasonForVisit.trim() || null,
    };

    if (totalAmount.trim() !== "") {
      const val = parseFloat(totalAmount);
      if (isNaN(val) || val < 0) {
        setError("Total amount must be a positive number.");
        setSaving(false);
        return;
      }
      body.totalAmount = val;
    } else {
      body.totalAmount = null;
    }

    if (paidAmount.trim() !== "") {
      const val = parseFloat(paidAmount);
      if (isNaN(val) || val < 0) {
        setError("Paid amount must be a positive number.");
        setSaving(false);
        return;
      }
      body.paidAmount = val;
    } else {
      body.paidAmount = null;
    }

    try {
      const res = await fetch(`/api/appointments/${appointment.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        onClose();
        onRefresh();
      } else {
        setError(data.error ?? "Failed to save. Please try again.");
      }
    } catch {
      setError("Failed to save. Please try again.");
    } finally {
      setSaving(false);
    }
  }, [
    appointment.id,
    bookingChannel,
    visitType,
    doctorId,
    preferredDateTime,
    reasonForVisit,
    totalAmount,
    paidAmount,
    onClose,
    onRefresh,
  ]);

  const labelClass = "block text-xs font-medium text-text-hint mb-1";
  const inputClass =
    "w-full rounded-md border border-border-primary bg-surface-primary px-3 py-1.5 text-sm text-text-primary focus:border-border-focus focus:outline-none focus:ring-1 focus:ring-focus-ring";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-surface-overlay/30" onClick={onClose} />
      <div className="relative z-10 w-full max-w-md rounded-lg border border-border-primary bg-surface-primary shadow-lg">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border-primary px-6 py-4">
          <div>
            <h3 className="text-base font-semibold text-text-primary">Edit Appointment</h3>
            <p className="text-xs text-text-hint mt-0.5">{appointment.patient.name}</p>
          </div>
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

        {/* Form */}
        <div className="space-y-4 px-6 py-4">
          {error && <Alert variant="error">{error}</Alert>}

          {/* Booking method */}
          <div>
            <label className={labelClass}>Booking method</label>
            <select
              value={bookingChannel}
              onChange={(e) => setBookingChannel(e.target.value as typeof bookingChannel)}
              className={inputClass}
            >
              {(Object.keys(CHANNEL_LABEL) as Array<keyof typeof CHANNEL_LABEL>).map((ch) => (
                <option key={ch} value={ch}>
                  {CHANNEL_LABEL[ch]}
                </option>
              ))}
            </select>
          </div>

          {/* Visit type */}
          <div>
            <label className={labelClass}>Visit type</label>
            <select
              value={visitType}
              onChange={(e) => setVisitType(e.target.value as typeof visitType)}
              className={inputClass}
            >
              {(Object.keys(VISIT_TYPE_LABEL) as Array<keyof typeof VISIT_TYPE_LABEL>).map((vt) => (
                <option key={vt} value={vt}>
                  {VISIT_TYPE_LABEL[vt]}
                </option>
              ))}
            </select>
          </div>

          {/* Treating doctor */}
          <div>
            <label className={labelClass}>Treating doctor</label>
            <select
              value={doctorId}
              onChange={(e) => setDoctorId(e.target.value)}
              className={inputClass}
            >
              <option value="">— No doctor assigned —</option>
              {doctors.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}{d.qualifications ? ` (${d.qualifications})` : ""}
                </option>
              ))}
            </select>
          </div>

          {/* Scheduled for */}
          <div>
            <label className={labelClass}>Scheduled for (IST)</label>
            <input
              type="datetime-local"
              value={preferredDateTime}
              onChange={(e) => setPreferredDateTime(e.target.value)}
              className={inputClass}
            />
          </div>

          {/* Chief complaint */}
          <div>
            <label className={labelClass}>Chief complaint</label>
            <textarea
              value={reasonForVisit}
              onChange={(e) => setReasonForVisit(e.target.value)}
              rows={3}
              maxLength={1000}
              className={`${inputClass} resize-none`}
              placeholder="Describe the chief complaint..."
            />
          </div>

          {/* Payment */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Total amount (₹)</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={totalAmount}
                onChange={(e) => setTotalAmount(e.target.value)}
                className={inputClass}
                placeholder="0.00"
              />
            </div>
            <div>
              <label className={labelClass}>Paid amount (₹)</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={paidAmount}
                onChange={(e) => setPaidAmount(e.target.value)}
                className={inputClass}
                placeholder="0.00"
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-2 border-t border-border-primary px-6 py-4">
          <Button
            variant="primary"
            loading={saving}
            loadingText="Saving..."
            onClick={handleSave}
          >
            Save changes
          </Button>
          <Button variant="secondary" disabled={saving} onClick={onClose}>
            Cancel
          </Button>
        </div>
      </div>
    </div>
  );
}
