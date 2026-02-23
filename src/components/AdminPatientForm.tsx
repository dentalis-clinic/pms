"use client";

import { FormEvent, useState, useMemo } from "react";
import { DateTime } from "luxon";
import { fullPatientSchema } from "@/lib/validations/appointment";
import { Button, Input, Textarea, FormField, Alert } from "@/components/ui";

const IST_ZONE = "Asia/Kolkata";
const DATETIME_FORMAT = "yyyy-MM-dd'T'HH:mm";

type FormState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "success"; patientId: string }
  | { status: "error"; message: string };

interface AdminPatientFormProps {
  onSuccess: (patientId: string) => void;
}

export default function AdminPatientForm({ onSuccess }: AdminPatientFormProps) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [preferredDateTime, setPreferredDateTime] = useState("");
  const [reasonForVisit, setReasonForVisit] = useState("");
  const [formState, setFormState] = useState<FormState>({ status: "idle" });

  const { minDateTime, maxDateTime } = useMemo(() => {
    const now = DateTime.now().setZone(IST_ZONE);
    return {
      minDateTime: now.toFormat(DATETIME_FORMAT),
      maxDateTime: now.plus({ hours: 72 }).toFormat(DATETIME_FORMAT),
    };
  }, []);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setFormState({ status: "loading" });

    const payload = {
      name,
      phone,
      email: email || undefined,
      dateOfBirth: dateOfBirth || undefined,
      preferredDateTime,
      reasonForVisit: reasonForVisit || undefined,
      submittedByAdmin: true as const,
    };

    // Client-side validation
    const result = fullPatientSchema.safeParse(payload);
    if (!result.success) {
      const firstIssue = result.error.issues[0];
      setFormState({
        status: "error",
        message: firstIssue?.message ?? "Please check your input.",
      });
      return;
    }

    try {
      const res = await fetch("/api/appointments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        setFormState({
          status: "error",
          message: data.error ?? "Something went wrong.",
        });
        return;
      }

      setFormState({ status: "success", patientId: data.patientId });
      onSuccess(data.patientId);
    } catch {
      setFormState({
        status: "error",
        message: "Network error. Please check your connection.",
      });
    }
  }

  function handleReset() {
    setName("");
    setPhone("");
    setEmail("");
    setDateOfBirth("");
    setPreferredDateTime("");
    setReasonForVisit("");
    setFormState({ status: "idle" });
  }

  if (formState.status === "success") {
    return (
      <div className="rounded-lg border border-success-500/20 bg-success-50 p-6 text-center">
        <div className="mb-2 text-sm font-medium text-success-700">
          Patient registered successfully!
        </div>
        <div className="mb-1 text-xs text-success-600">
          Patient ID
        </div>
        <div className="mb-4 font-mono text-2xl font-bold tracking-wider text-success-700">
          {formState.patientId}
        </div>
        <Button variant="success" onClick={handleReset}>
          Register another patient
        </Button>
      </div>
    );
  }

  const isLoading = formState.status === "loading";

  return (
    <form
      onSubmit={handleSubmit}
      className="max-w-lg space-y-4 rounded-lg border border-neutral-200 bg-surface-primary p-6 shadow-sm"
    >
      <h3 className="text-lg font-semibold text-neutral-950">
        Walk-in Registration
      </h3>

      {formState.status === "error" && (
        <Alert variant="error">{formState.message}</Alert>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label="Full Name *" htmlFor="admin-name">
          <Input id="admin-name" type="text" value={name} onChange={(e) => setName(e.target.value)} required maxLength={100} placeholder="Patient's full name" disabled={isLoading} />
        </FormField>

        <FormField label="Phone *" htmlFor="admin-phone">
          <Input id="admin-phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} required placeholder="10-digit mobile" disabled={isLoading} />
        </FormField>

        <FormField label="Email" htmlFor="admin-email">
          <Input id="admin-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="patient@example.com" disabled={isLoading} />
        </FormField>

        <FormField label="Date of Birth" htmlFor="admin-dob">
          <Input id="admin-dob" type="date" value={dateOfBirth} onChange={(e) => setDateOfBirth(e.target.value)} disabled={isLoading} />
        </FormField>

        <FormField label="Preferred Date & Time *" htmlFor="admin-datetime" hint="Within the next 3 days">
          <Input id="admin-datetime" type="datetime-local" value={preferredDateTime} onChange={(e) => setPreferredDateTime(e.target.value)} required min={minDateTime} max={maxDateTime} disabled={isLoading} />
        </FormField>
      </div>

      <FormField label="Reason for Visit" htmlFor="admin-reason">
        <Textarea id="admin-reason" value={reasonForVisit} onChange={(e) => setReasonForVisit(e.target.value)} rows={3} maxLength={1000} placeholder="Describe the reason for visit" disabled={isLoading} />
      </FormField>

      <Button type="submit" disabled={isLoading} fullWidth loading={isLoading} loadingText="Registering...">
        Register Patient
      </Button>
    </form>
  );
}
