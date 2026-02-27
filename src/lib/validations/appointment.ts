import { z } from "zod/v4";
import { DateTime } from "luxon";
import {
  isSlotWithinBusinessHours,
  isSlotAligned,
} from "@/lib/utils/time-slots";
import { BUSINESS_HOURS_CONFIG } from "@/lib/config/business-hours";

// --- Phone check (public progressive form) ---

export const phoneCheckSchema = z.object({
  phone: z
    .string()
    .trim()
    .min(1, "Phone number is required")
    .regex(/^\+?[\d\s\-()]+$/, "Invalid phone number format"),
});

// --- Public booking base fields (shared by public + walk-in) ---

const publicBookingBaseSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Name is required")
    .max(100, "Name must be 100 characters or less")
    .optional(),
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
    .refine(
      (date) => date > new Date(),
      "Preferred time must be in the future"
    )
    .refine((date) => {
      const maxDate = new Date(Date.now() + 72 * 60 * 60 * 1000);
      return date <= maxDate;
    }, "Preferred time must be within the next 3 days")
    .refine((date) => {
      const datetime = DateTime.fromJSDate(date, {
        zone: BUSINESS_HOURS_CONFIG.timezone,
      });
      return isSlotWithinBusinessHours(datetime);
    }, "Selected time is outside clinic hours (10:00 AM - 2:00 PM, 4:00 PM - 10:00 PM)")
    .refine((date) => {
      const datetime = DateTime.fromJSDate(date, {
        zone: BUSINESS_HOURS_CONFIG.timezone,
      });
      return isSlotAligned(datetime);
    }, "Please select a valid time slot"),
  existingPatientId: z.string().uuid("Invalid patient ID").optional(),
});

// --- Public booking (patient self-service) ---
// Returning patients submit existingPatientId (no name needed).
// New patients must provide a name.

export const publicBookingSchema = publicBookingBaseSchema.refine(
  (data) => data.existingPatientId || data.name,
  { message: "Name is required for new patients", path: ["name"] }
);

// --- Walk-in registration (admin, full form) ---

export const walkInSchema = publicBookingBaseSchema.extend({
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

// --- Follow-up appointment (admin, existing patient) ---

export const followUpSchema = z.object({
  patientId: z.string().uuid("Invalid patient ID"),
  preferredDateTime: z
    .string()
    .min(1, "Preferred date and time is required")
    .transform((val) => new Date(val))
    .refine((date) => !isNaN(date.getTime()), "Invalid date format")
    .refine(
      (date) => date > new Date(),
      "Preferred time must be in the future"
    )
    .refine((date) => {
      const datetime = DateTime.fromJSDate(date, {
        zone: BUSINESS_HOURS_CONFIG.timezone,
      });
      return isSlotWithinBusinessHours(datetime);
    }, "Selected time is outside clinic hours (10:00 AM - 2:00 PM, 4:00 PM - 10:00 PM)")
    .refine((date) => {
      const datetime = DateTime.fromJSDate(date, {
        zone: BUSINESS_HOURS_CONFIG.timezone,
      });
      return isSlotAligned(datetime);
    }, "Please select a valid time slot"),
  reasonForVisit: z
    .string()
    .trim()
    .max(1000, "Reason must be 1000 characters or less")
    .optional()
    .or(z.literal("")),
});

// --- Patch appointment (admin updates) ---

export const patchAppointmentSchema = z.object({
  status: z
    .enum(["TENTATIVE", "CONFIRMED", "COMPLETED", "CANCELLED"])
    .optional(),
  reasonForVisit: z
    .string()
    .trim()
    .max(1000, "Reason must be 1000 characters or less")
    .optional()
    .or(z.literal("")),
  notes: z
    .string()
    .trim()
    .max(2000, "Notes must be 2000 characters or less")
    .optional()
    .or(z.literal("")),
  preferredDateTime: z
    .string()
    .transform((val) => new Date(val))
    .refine((date) => !isNaN(date.getTime()), "Invalid date format")
    .refine((date) => {
      const datetime = DateTime.fromJSDate(date, {
        zone: BUSINESS_HOURS_CONFIG.timezone,
      });
      return isSlotWithinBusinessHours(datetime);
    }, "Selected time is outside clinic hours (10:00 AM - 2:00 PM, 4:00 PM - 10:00 PM)")
    .refine((date) => {
      const datetime = DateTime.fromJSDate(date, {
        zone: BUSINESS_HOURS_CONFIG.timezone,
      });
      return isSlotAligned(datetime);
    }, "Please select a valid time slot")
    .optional(),
});

// --- Unified confirm/new appointment (admin, slide-over form) ---

export const confirmAppointmentSchema = z.object({
  // Patient fields
  phone: z
    .string()
    .trim()
    .min(1, "Phone number is required")
    .regex(/^\+?[\d\s\-()]+$/, "Invalid phone number format"),
  name: z
    .string()
    .trim()
    .min(1, "Name is required")
    .max(100, "Name must be 100 characters or less"),
  sex: z.enum(["MALE", "FEMALE", "OTHER"]).optional(),
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
  email: z
    .string()
    .trim()
    .email("Invalid email address")
    .optional()
    .or(z.literal("")),
  // Appointment fields (no 72-hour limit for admin)
  preferredDateTime: z
    .string()
    .min(1, "Preferred date and time is required")
    .transform((val) => new Date(val))
    .refine((date) => !isNaN(date.getTime()), "Invalid date format")
    .refine((date) => {
      const datetime = DateTime.fromJSDate(date, {
        zone: BUSINESS_HOURS_CONFIG.timezone,
      });
      return isSlotWithinBusinessHours(datetime);
    }, "Selected time is outside clinic hours (10:00 AM - 2:00 PM, 4:00 PM - 10:00 PM)")
    .refine((date) => {
      const datetime = DateTime.fromJSDate(date, {
        zone: BUSINESS_HOURS_CONFIG.timezone,
      });
      return isSlotAligned(datetime);
    }, "Please select a valid time slot"),
  reasonForVisit: z
    .string()
    .trim()
    .max(1000, "Reason must be 1000 characters or less")
    .optional()
    .or(z.literal("")),
  // Context: which flow are we in?
  existingAppointmentId: z.string().uuid().optional(),
  existingPatientId: z.string().uuid().optional(),
  // Visit type for returning patients (new appointment mode only)
  visitType: z.enum(["NEW_CONSULTATION", "FOLLOW_UP"]).optional(),
});

export type ConfirmAppointmentInput = z.input<typeof confirmAppointmentSchema>;

// --- Patch patient demographics (admin updates) ---

export const patchPatientSchema = z.object({
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
  sex: z.enum(["MALE", "FEMALE", "OTHER"]).optional(),
});

// --- Inferred types ---

export type PublicBookingInput = z.input<typeof publicBookingSchema>;
export type WalkInInput = z.input<typeof walkInSchema>;
export type FollowUpInput = z.input<typeof followUpSchema>;
export type PatchAppointmentInput = z.input<typeof patchAppointmentSchema>;
export type PatchPatientInput = z.input<typeof patchPatientSchema>;
