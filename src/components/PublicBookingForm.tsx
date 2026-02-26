"use client";

import { FormEvent, useState, useMemo, useRef } from "react";
import { DateTime } from "luxon";
import { publicBookingSchema } from "@/lib/validations/appointment";
import { formatISTDateTime } from "@/lib/utils/date";
import { Button, Input, FormField, Alert } from "@/components/ui";
import type { PatientMatch } from "@/types/patient";

const IST_ZONE = "Asia/Kolkata";
const DATETIME_FORMAT = "yyyy-MM-dd'T'HH:mm";

type FormState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "success"; patientId: string; preferredDateTime: string }
  | { status: "error"; message: string };

type LookupState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "success"; patients: PatientMatch[] }
  | { status: "error"; message: string };

export default function PublicBookingForm() {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [preferredDateTime, setPreferredDateTime] = useState("");
  const [formState, setFormState] = useState<FormState>({ status: "idle" });
  const [lookupState, setLookupState] = useState<LookupState>({
    status: "idle",
  });
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(
    null
  );
  const [showWelcomeMessage, setShowWelcomeMessage] = useState(false);
  const phoneInputTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null
  );

  const { minDateTime, maxDateTime } = useMemo(() => {
    const now = DateTime.now().setZone(IST_ZONE);
    return {
      minDateTime: now.toFormat(DATETIME_FORMAT),
      maxDateTime: now.plus({ hours: 72 }).toFormat(DATETIME_FORMAT),
    };
  }, []);

  async function performPhoneLookup(phoneValue: string) {
    // Only lookup if phone is exactly 10 digits
    const digits = phoneValue.replace(/\D/g, "");
    if (digits.length !== 10) {
      setLookupState({ status: "idle" });
      return;
    }

    setLookupState({ status: "loading" });

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      const res = await fetch(
        `/api/patients/lookup?phone=${encodeURIComponent(phoneValue)}`,
        {
          signal: controller.signal,
        }
      );

      clearTimeout(timeoutId);
      const data = await res.json();

      if (!res.ok) {
        setLookupState({
          status: "error",
          message: data.error ?? "Lookup failed",
        });
        return;
      }

      setLookupState({ status: "success", patients: data.patients });

      // Auto-fill if exactly one match
      if (data.patients.length === 1) {
        setName(data.patients[0].name);
        setSelectedPatientId(data.patients[0].id);
        setShowWelcomeMessage(true);
      }
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        setLookupState({ status: "error", message: "Lookup timed out" });
      } else {
        setLookupState({ status: "error", message: "Network error" });
      }
    }
  }

  function handlePhoneChange(value: string) {
    setPhone(value);
    setShowWelcomeMessage(false);
    setSelectedPatientId(null);

    // Clear previous timeout
    if (phoneInputTimeoutRef.current) {
      clearTimeout(phoneInputTimeoutRef.current);
    }

    // Debounce: wait 500ms after user stops typing
    phoneInputTimeoutRef.current = setTimeout(() => {
      performPhoneLookup(value);
    }, 500);
  }

  function handleNameChange(value: string) {
    setName(value);
    // If user manually changes name after auto-fill, reset welcome message
    if (showWelcomeMessage) {
      setShowWelcomeMessage(false);
      setSelectedPatientId(null);
    }
  }

  function handlePatientSelect(patientId: string) {
    const patient = (
      lookupState.status === "success" ? lookupState.patients : []
    ).find((p) => p.id === patientId);
    if (patient) {
      setName(patient.name);
      setSelectedPatientId(patient.id);
      setShowWelcomeMessage(true);
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setFormState({ status: "loading" });

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

      setFormState({
        status: "success",
        patientId: data.patientId,
        preferredDateTime: data.preferredDateTime,
      });
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
    setLookupState({ status: "idle" });
    setSelectedPatientId(null);
    setShowWelcomeMessage(false);
    if (phoneInputTimeoutRef.current) {
      clearTimeout(phoneInputTimeoutRef.current);
    }
  }

  if (formState.status === "success") {
    return (
      <div className="rounded-lg border border-border-success/20 bg-surface-success p-6 text-center">
        <div className="mb-2 text-lg font-semibold text-text-success">
          Appointment Tentatively Booked
        </div>
        <p className="mb-3 text-sm text-text-success">
          Your appointment is tentatively scheduled for:
        </p>
        <div className="mb-3 text-lg font-bold text-text-success">
          {formatISTDateTime(new Date(formState.preferredDateTime))}
        </div>
        <p className="mb-4 text-sm text-text-success">
          The doctor will confirm your appointment based on availability.
          You may be contacted on your phone for confirmation.
        </p>
        <p className="mb-4 text-xs text-text-success/70">
          Reference: {formState.patientId}
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
      className="space-y-4 rounded-lg border border-border-primary bg-surface-primary p-6 shadow-sm"
    >
      {formState.status === "error" && (
        <Alert variant="error">{formState.message}</Alert>
      )}

      <FormField label="Phone Number" htmlFor="phone">
        <div className="relative">
          <Input
            id="phone"
            type="tel"
            value={phone}
            onChange={(e) => handlePhoneChange(e.target.value)}
            required
            autoComplete="tel"
            placeholder="10-digit mobile number"
            disabled={isLoading}
          />
          {lookupState.status === "loading" && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-blue-600" />
            </div>
          )}
        </div>
      </FormField>

      {showWelcomeMessage &&
        lookupState.status === "success" &&
        lookupState.patients.length === 1 && (
          <Alert variant="info">
            Welcome back! Last visit:{" "}
            {lookupState.patients[0].lastVisitDate
              ? formatISTDateTime(new Date(lookupState.patients[0].lastVisitDate))
              : "No previous appointments"}
          </Alert>
        )}

      {lookupState.status === "success" && lookupState.patients.length > 1 && (
        <FormField label="Select Your Profile" htmlFor="patient-select">
          <select
            id="patient-select"
            className="w-full rounded-md border border-border-primary bg-surface-primary px-3 py-2 text-text-primary focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            value={selectedPatientId ?? ""}
            onChange={(e) => handlePatientSelect(e.target.value)}
          >
            <option value="">-- Select your name --</option>
            {lookupState.patients.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} (Last visit:{" "}
                {p.lastVisitDate
                  ? formatISTDateTime(new Date(p.lastVisitDate))
                  : "First time"}
                )
              </option>
            ))}
          </select>
        </FormField>
      )}

      {lookupState.status === "error" && (
        <Alert variant="warning">
          {lookupState.message}. You can continue booking manually.
        </Alert>
      )}

      <FormField label="Full Name" htmlFor="name">
        <Input
          id="name"
          type="text"
          value={name}
          onChange={(e) => handleNameChange(e.target.value)}
          required
          maxLength={100}
          autoComplete="name"
          placeholder="Enter your full name"
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
