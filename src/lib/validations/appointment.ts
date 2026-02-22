import { z } from "zod/v4";

/**
 * Public booking form — minimal fields only.
 * Used by patients on the public form and as the base for admin submissions.
 */
export const publicBookingSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Name is required")
    .max(100, "Name must be 100 characters or less"),
  phone: z
    .string()
    .trim()
    .min(1, "Phone number is required")
    .regex(/^\+?[\d\s\-()]+$/, "Invalid phone number format"),
  preferredDateTime: z
    .string()
    .min(1, "Preferred date and time is required")
    .transform((val) => new Date(val))
    .refine((date) => !isNaN(date.getTime()), "Invalid date format")
    .refine((date) => date > new Date(), "Preferred time must be in the future")
    .refine((date) => {
      const maxDate = new Date(Date.now() + 72 * 60 * 60 * 1000);
      return date <= maxDate;
    }, "Preferred time must be within the next 3 days"),
});

/**
 * Full patient form — all fields, used by admin for walk-in registration.
 * Extends the public schema with optional admin-only fields.
 */
export const fullPatientSchema = publicBookingSchema.extend({
  email: z
    .string()
    .trim()
    .email("Invalid email address")
    .optional()
    .or(z.literal("")),
  dateOfBirth: z
    .string()
    .optional()
    .or(z.literal(""))
    .transform((val) => (val ? new Date(val) : undefined))
    .refine(
      (date) => !date || !isNaN(date.getTime()),
      "Invalid date of birth"
    )
    .refine(
      (date) => !date || date < new Date(),
      "Date of birth must be in the past"
    ),
  reasonForVisit: z
    .string()
    .trim()
    .max(1000, "Reason must be 1000 characters or less")
    .optional()
    .or(z.literal("")),
  submittedByAdmin: z.literal(true).optional(),
});

/**
 * Patch schema — for admin completing a partial record.
 * All fields optional since admin may fill in one or more missing fields.
 */
export const patchPatientSchema = z.object({
  email: z
    .string()
    .trim()
    .email("Invalid email address")
    .optional()
    .or(z.literal("")),
  dateOfBirth: z
    .string()
    .optional()
    .or(z.literal(""))
    .transform((val) => (val ? new Date(val) : undefined))
    .refine(
      (date) => !date || !isNaN(date.getTime()),
      "Invalid date of birth"
    )
    .refine(
      (date) => !date || date < new Date(),
      "Date of birth must be in the past"
    ),
  reasonForVisit: z
    .string()
    .trim()
    .max(1000, "Reason must be 1000 characters or less")
    .optional()
    .or(z.literal("")),
  name: z
    .string()
    .trim()
    .min(1, "Name is required")
    .max(100, "Name must be 100 characters or less")
    .optional(),
  phone: z
    .string()
    .trim()
    .regex(/^\+?[\d\s\-()]+$/, "Invalid phone number format")
    .optional(),
  preferredDateTime: z
    .string()
    .transform((val) => new Date(val))
    .refine((date) => !isNaN(date.getTime()), "Invalid date format")
    .optional(),
});

/** Inferred types for use in components and API routes. */
export type PublicBookingInput = z.input<typeof publicBookingSchema>;
export type FullPatientInput = z.input<typeof fullPatientSchema>;
export type PatchPatientInput = z.input<typeof patchPatientSchema>;
