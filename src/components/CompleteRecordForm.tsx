"use client";

import { FormEvent, useState, useEffect } from "react";
import type { PatientRow } from "@/types/patient";
import { Button, Input, Textarea, FormField, Alert } from "@/components/ui";

interface CompleteRecordFormProps {
  patient: PatientRow;
  onClose: () => void;
  onSuccess: (updated: PatientRow) => void;
}

type FormState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "error"; message: string };

export default function CompleteRecordForm({
  patient,
  onClose,
  onSuccess,
}: CompleteRecordFormProps) {
  const [email, setEmail] = useState(patient.email ?? "");
  const [dateOfBirth, setDateOfBirth] = useState(
    patient.dateOfBirth ? patient.dateOfBirth.split("T")[0] : ""
  );
  const [reasonForVisit, setReasonForVisit] = useState(
    patient.reasonForVisit ?? ""
  );
  const [name, setName] = useState(patient.name);
  const [phone, setPhone] = useState(patient.phone);
  const [formState, setFormState] = useState<FormState>({ status: "idle" });

  // Close on Escape key
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setFormState({ status: "loading" });

    const body: Record<string, string> = {};
    if (name !== patient.name) body.name = name;
    if (phone !== patient.phone) body.phone = phone;
    if (email !== (patient.email ?? "")) body.email = email;
    if (dateOfBirth !== (patient.dateOfBirth?.split("T")[0] ?? ""))
      body.dateOfBirth = dateOfBirth;
    if (reasonForVisit !== (patient.reasonForVisit ?? ""))
      body.reasonForVisit = reasonForVisit;

    if (Object.keys(body).length === 0) {
      onClose();
      return;
    }

    try {
      const res = await fetch(`/api/appointments/${patient.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (!res.ok) {
        setFormState({
          status: "error",
          message: data.error ?? "Something went wrong.",
        });
        return;
      }

      onSuccess(data.patient);
    } catch {
      setFormState({
        status: "error",
        message: "Network error. Please try again.",
      });
    }
  }

  const isLoading = formState.status === "loading";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-brand-950/50"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="mx-4 w-full max-w-md rounded-lg border border-neutral-200 bg-surface-primary p-6 shadow-lg">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-neutral-950">
            Edit Record
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="text-neutral-400 hover:text-neutral-600"
          >
            &times;
          </button>
        </div>

        <p className="mb-4 text-sm text-neutral-500">
          {patient.patientId} &mdash; {patient.name}
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          {formState.status === "error" && (
            <Alert variant="error">{formState.message}</Alert>
          )}

          <FormField label="Name" htmlFor="edit-name">
            <Input id="edit-name" type="text" value={name} onChange={(e) => setName(e.target.value)} required maxLength={100} disabled={isLoading} />
          </FormField>

          <FormField label="Phone" htmlFor="edit-phone">
            <Input id="edit-phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} required disabled={isLoading} />
          </FormField>

          <FormField label="Email" htmlFor="edit-email" missing={!patient.email}>
            <Input id="edit-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="patient@example.com" disabled={isLoading} />
          </FormField>

          <FormField label="Date of Birth" htmlFor="edit-dob" missing={!patient.dateOfBirth}>
            <Input id="edit-dob" type="date" value={dateOfBirth} onChange={(e) => setDateOfBirth(e.target.value)} disabled={isLoading} />
          </FormField>

          <FormField label="Reason for Visit" htmlFor="edit-reason" missing={!patient.reasonForVisit}>
            <Textarea id="edit-reason" value={reasonForVisit} onChange={(e) => setReasonForVisit(e.target.value)} rows={3} maxLength={1000} placeholder="Describe the reason for visit" disabled={isLoading} />
          </FormField>

          <div className="flex gap-3">
            <Button type="submit" disabled={isLoading} className="flex-1" loading={isLoading} loadingText="Saving...">
              Save Changes
            </Button>
            <Button type="button" variant="secondary" onClick={onClose} disabled={isLoading}>
              Cancel
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
