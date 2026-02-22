"use client";

import { FormEvent, useState, useEffect } from "react";
import type { PatientRow } from "@/types/patient";

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

  const inputClassName =
    "block w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 dark:placeholder:text-zinc-500 dark:focus:border-zinc-400 dark:focus:ring-zinc-400";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="mx-4 w-full max-w-md rounded-lg border border-zinc-200 bg-white p-6 shadow-lg dark:border-zinc-700 dark:bg-zinc-900">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
            Edit Record
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
          >
            &times;
          </button>
        </div>

        <p className="mb-4 text-sm text-zinc-500 dark:text-zinc-400">
          {patient.patientId} &mdash; {patient.name}
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          {formState.status === "error" && (
            <div className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-400">
              {formState.message}
            </div>
          )}

          <div className="space-y-1.5">
            <label htmlFor="edit-name" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Name
            </label>
            <input id="edit-name" type="text" value={name} onChange={(e) => setName(e.target.value)} required maxLength={100} className={inputClassName} disabled={isLoading} />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="edit-phone" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Phone
            </label>
            <input id="edit-phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} required className={inputClassName} disabled={isLoading} />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="edit-email" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Email {!patient.email && <span className="text-amber-500">(missing)</span>}
            </label>
            <input id="edit-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} className={inputClassName} placeholder="patient@example.com" disabled={isLoading} />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="edit-dob" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Date of Birth {!patient.dateOfBirth && <span className="text-amber-500">(missing)</span>}
            </label>
            <input id="edit-dob" type="date" value={dateOfBirth} onChange={(e) => setDateOfBirth(e.target.value)} className={inputClassName} disabled={isLoading} />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="edit-reason" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Reason for Visit {!patient.reasonForVisit && <span className="text-amber-500">(missing)</span>}
            </label>
            <textarea id="edit-reason" value={reasonForVisit} onChange={(e) => setReasonForVisit(e.target.value)} rows={3} maxLength={1000} className={inputClassName} placeholder="Describe the reason for visit" disabled={isLoading} />
          </div>

          <div className="flex gap-3">
            <button
              type="submit"
              disabled={isLoading}
              className="flex-1 rounded-md bg-zinc-900 px-3 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
            >
              {isLoading ? "Saving..." : "Save Changes"}
            </button>
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="rounded-md border border-zinc-300 px-3 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-600 dark:text-zinc-300 dark:hover:bg-zinc-800"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
