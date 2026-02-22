"use client";

import { FormEvent, useState, useMemo } from "react";
import { DateTime } from "luxon";
import { publicBookingSchema } from "@/lib/validations/appointment";

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
      <div className="rounded-lg border border-green-200 bg-green-50 p-6 text-center dark:border-green-900 dark:bg-green-950">
        <div className="mb-2 text-sm font-medium text-green-700 dark:text-green-400">
          Booking submitted successfully!
        </div>
        <div className="mb-1 text-xs text-green-600 dark:text-green-500">
          Your Patient ID
        </div>
        <div className="mb-4 font-mono text-2xl font-bold tracking-wider text-green-800 dark:text-green-300">
          {formState.patientId}
        </div>
        <p className="mb-4 text-sm text-green-600 dark:text-green-500">
          Please save this ID. You&apos;ll need it when you visit the clinic.
        </p>
        <button
          onClick={handleReset}
          type="button"
          className="rounded-md border border-green-300 bg-white px-4 py-2 text-sm font-medium text-green-700 hover:bg-green-50 dark:border-green-800 dark:bg-green-900 dark:text-green-300 dark:hover:bg-green-800"
        >
          Book another appointment
        </button>
      </div>
    );
  }

  const isLoading = formState.status === "loading";

  const inputClassName =
    "block w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 dark:placeholder:text-zinc-500 dark:focus:border-zinc-400 dark:focus:ring-zinc-400";

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-4 rounded-lg border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900"
    >
      {formState.status === "error" && (
        <div className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-400">
          {formState.message}
        </div>
      )}

      <div className="space-y-1.5">
        <label
          htmlFor="name"
          className="block text-sm font-medium text-zinc-700 dark:text-zinc-300"
        >
          Full Name
        </label>
        <input
          id="name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          maxLength={100}
          autoComplete="name"
          className={inputClassName}
          placeholder="Enter your full name"
          disabled={isLoading}
        />
      </div>

      <div className="space-y-1.5">
        <label
          htmlFor="phone"
          className="block text-sm font-medium text-zinc-700 dark:text-zinc-300"
        >
          Phone Number
        </label>
        <input
          id="phone"
          type="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          required
          autoComplete="tel"
          className={inputClassName}
          placeholder="10-digit mobile number"
          disabled={isLoading}
        />
      </div>

      <div className="space-y-1.5">
        <label
          htmlFor="preferredDateTime"
          className="block text-sm font-medium text-zinc-700 dark:text-zinc-300"
        >
          Preferred Date & Time
        </label>
        <input
          id="preferredDateTime"
          type="datetime-local"
          value={preferredDateTime}
          onChange={(e) => setPreferredDateTime(e.target.value)}
          required
          min={minDateTime}
          max={maxDateTime}
          className={inputClassName}
          disabled={isLoading}
        />
        <p className="text-xs text-zinc-500 dark:text-zinc-400">
          Must be within the next 3 days
        </p>
      </div>

      <button
        type="submit"
        disabled={isLoading}
        className="w-full rounded-md bg-zinc-900 px-3 py-2 text-sm font-medium text-white hover:bg-zinc-800 focus:ring-2 focus:ring-zinc-500 focus:ring-offset-2 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200 dark:focus:ring-zinc-400 dark:focus:ring-offset-zinc-900"
      >
        {isLoading ? "Submitting…" : "Book Appointment"}
      </button>
    </form>
  );
}
