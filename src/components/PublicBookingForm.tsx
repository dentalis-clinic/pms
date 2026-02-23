"use client";

import { FormEvent, useState, useMemo } from "react";
import { DateTime } from "luxon";
import { publicBookingSchema } from "@/lib/validations/appointment";
import { Button, Input, FormField, Alert } from "@/components/ui";

const IST_ZONE = "Asia/Kolkata";
const DATETIME_FORMAT = "yyyy-MM-dd'T'HH:mm";

type FormState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "success"; patientId: string }
  | { status: "error"; message: string };

export default function PublicBookingForm() {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [preferredDateTime, setPreferredDateTime] = useState("");
  const [formState, setFormState] = useState<FormState>({ status: "idle" });

  // Compute min/max for datetime-local input (IST)
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

    // Client-side validation
    const result = publicBookingSchema.safeParse({
      name,
      phone,
      preferredDateTime,
    });

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
        body: JSON.stringify({ name, phone, preferredDateTime }),
      });

      const data = await res.json();

      if (!res.ok) {
        setFormState({
          status: "error",
          message: data.error ?? "Something went wrong. Please try again.",
        });
        return;
      }

      setFormState({ status: "success", patientId: data.patientId });
    } catch {
      setFormState({
        status: "error",
        message: "Network error. Please check your connection and try again.",
      });
    }
  }

  function handleReset() {
    setName("");
    setPhone("");
    setPreferredDateTime("");
    setFormState({ status: "idle" });
  }

  // Success view
  if (formState.status === "success") {
    return (
      <div className="rounded-lg border border-success-500/20 bg-success-50 p-6 text-center">
        <div className="mb-2 text-sm font-medium text-success-700">
          Booking submitted successfully!
        </div>
        <div className="mb-1 text-xs text-success-600">
          Your Patient ID
        </div>
        <div className="mb-4 font-mono text-2xl font-bold tracking-wider text-success-700">
          {formState.patientId}
        </div>
        <p className="mb-4 text-sm text-success-600">
          Please save this ID. You&apos;ll need it when you visit the clinic.
        </p>
        <Button variant="success" onClick={handleReset}>
          Book another appointment
        </Button>
      </div>
    );
  }

  const isLoading = formState.status === "loading";

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-4 rounded-lg border border-neutral-200 bg-surface-primary p-6 shadow-sm"
    >
      {formState.status === "error" && (
        <Alert variant="error">{formState.message}</Alert>
      )}

      <FormField label="Full Name" htmlFor="name">
        <Input
          id="name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          maxLength={100}
          autoComplete="name"
          placeholder="Enter your full name"
          disabled={isLoading}
        />
      </FormField>

      <FormField label="Phone Number" htmlFor="phone">
        <Input
          id="phone"
          type="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          required
          autoComplete="tel"
          placeholder="10-digit mobile number"
          disabled={isLoading}
        />
      </FormField>

      <FormField label="Preferred Date & Time" htmlFor="preferredDateTime" hint="Must be within the next 3 days">
        <Input
          id="preferredDateTime"
          type="datetime-local"
          value={preferredDateTime}
          onChange={(e) => setPreferredDateTime(e.target.value)}
          required
          min={minDateTime}
          max={maxDateTime}
          disabled={isLoading}
        />
      </FormField>

      <Button type="submit" disabled={isLoading} fullWidth loading={isLoading} loadingText="Submitting…">
        Book Appointment
      </Button>
    </form>
  );
}
